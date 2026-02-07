'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, MessageSquare, Trash2, Reply } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Comment {
  id: string;
  content: string;
  userId: string;
  user: {
    displayName: string | null;
    email: string;
  };
  createdAt: string;
  parentId: string | null;
  alertGroupId: string;
  replies?: Comment[];
}

interface CollaborationFeedProps {
  alertGroupId: string;
  workspaceId: string;
}

export function CollaborationFeed({ alertGroupId, workspaceId }: CollaborationFeedProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchComments();
    
    // Initialize Socket
    const socket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events`, {
      transports: ['websocket'],
      auth: {
         // Token will be added by interceptor usually, but here we might need it explicitly if no sessions
      }
    });

    socket.on('connect', () => {
      socket.emit('join_workspace', { workspaceId });
    });

    socket.on('incident.comment_added', (comment: Comment) => {
      if (comment.alertGroupId === alertGroupId) {
        setComments(prev => [comment, ...prev]);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [alertGroupId, workspaceId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/incidents/${alertGroupId}/comments`);
      if (res.ok) {
        setComments(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/incidents/${alertGroupId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: newComment,
          parentId: replyTo
        }),
      });

      if (res.ok) {
        setNewComment('');
        setReplyTo(null);
        // Socket will handle update
      }
    } catch (error) {
      console.error('Failed to post comment', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">
    <div className="h-20 bg-stone-100 rounded-lg"></div>
    <div className="h-20 bg-stone-100 rounded-lg"></div>
  </div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-stone-700 font-semibold">
          <MessageSquare className="w-4 h-4" />
          Collaboration Log
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Textarea
              placeholder={replyTo ? 'Write a reply...' : 'Add information or discuss the incident...'}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="resize-none border-stone-200 focus:border-red-500 focus:ring-red-500"
              rows={3}
            />
            {replyTo && (
              <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-stone-500 bg-stone-100 px-2 py-1 rounded">
                Replying <X className="w-3 h-3 cursor-pointer" onClick={() => setReplyTo(null)} />
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={handlePostComment} 
              disabled={sending || !newComment.trim()}
              className="bg-stone-900 text-white hover:bg-stone-800"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-xs shrink-0">
              {(comment.user.displayName || comment.user.email)[0].toUpperCase()}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-900">
                  {comment.user.displayName || comment.user.email}
                </span>
                <span className="text-[10px] text-stone-500">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="bg-stone-50 border border-stone-100 rounded-lg p-3 text-sm text-stone-700">
                {comment.content}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-stone-500">
                <button 
                  onClick={() => setReplyTo(comment.id)}
                  className="hover:text-red-600 transition-colors flex items-center gap-1"
                >
                  <Reply className="w-3 h-3" /> Reply
                </button>
                {comment.userId === (user?.id) && (
                  <button className="hover:text-red-600 transition-colors flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className="text-center py-8 text-stone-400 text-sm italic">
            No discussion yet. Be the first to coordinate.
          </div>
        )}
      </div>
    </div>
  );
}

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
