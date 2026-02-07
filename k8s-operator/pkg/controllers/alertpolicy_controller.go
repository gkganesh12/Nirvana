package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/go-logr/logr"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	v1alpha1 "github.com/signalcraft/signalcraft-operator/pkg/api/v1alpha1"
)

type AlertPolicyReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Log    logr.Logger
	HTTP   *http.Client
}

func (r *AlertPolicyReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := r.Log.WithValues("signalcraftalertpolicy", req.NamespacedName)

	policy := &v1alpha1.SignalCraftAlertPolicy{}
	if err := r.Get(ctx, types.NamespacedName{Name: req.Name, Namespace: req.Namespace}, policy); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	logger.Info("Reconciling SignalCraftAlertPolicy", "name", policy.ObjectMeta.Name)

	baseURL := os.Getenv("SIGNALCRAFT_API_URL")
	apiKey := os.Getenv("SIGNALCRAFT_API_KEY")
	if baseURL == "" || apiKey == "" {
		policy.Status.State = "Error"
		policy.Status.Message = "Missing SIGNALCRAFT_API_URL or SIGNALCRAFT_API_KEY"
		policy.Status.ObservedGeneration = policy.ObjectMeta.Generation
		policy.Status.LastSyncedAt = metav1.NewTime(time.Now())
		_ = r.Status().Update(ctx, policy)
		return ctrl.Result{RequeueAfter: time.Minute}, nil
	}

	if r.HTTP == nil {
		r.HTTP = &http.Client{Timeout: 20 * time.Second}
	}

	finalizer := "signalcraft.io/finalizer"
	if policy.ObjectMeta.DeletionTimestamp != nil {
		if containsString(policy.ObjectMeta.Finalizers, finalizer) {
			if err := deleteAlertPolicy(ctx, r.HTTP, baseURL, apiKey, policy); err != nil {
				logger.Error(err, "Failed to delete SignalCraft policy")
				policy.Status.State = "Error"
				policy.Status.Message = err.Error()
				policy.Status.ObservedGeneration = policy.ObjectMeta.Generation
				policy.Status.LastSyncedAt = metav1.NewTime(time.Now())
				_ = r.Status().Update(ctx, policy)
				return ctrl.Result{RequeueAfter: time.Minute}, nil
			}
			policy.ObjectMeta.Finalizers = removeString(policy.ObjectMeta.Finalizers, finalizer)
			if err := r.Update(ctx, policy); err != nil {
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	}

	if !containsString(policy.ObjectMeta.Finalizers, finalizer) {
		policy.ObjectMeta.Finalizers = append(policy.ObjectMeta.Finalizers, finalizer)
		if err := r.Update(ctx, policy); err != nil {
			return ctrl.Result{}, err
		}
	}

	if err := syncAlertPolicy(ctx, r.HTTP, baseURL, apiKey, policy); err != nil {
		logger.Error(err, "Failed to sync SignalCraft policy")
		policy.Status.State = "Error"
		policy.Status.Message = err.Error()
		policy.Status.ObservedGeneration = policy.ObjectMeta.Generation
		policy.Status.LastSyncedAt = metav1.NewTime(time.Now())
		_ = r.Status().Update(ctx, policy)
		return ctrl.Result{RequeueAfter: time.Minute}, nil
	}

	policy.Status.State = "Synced"
	policy.Status.Message = "Synced to SignalCraft"
	policy.Status.ObservedGeneration = policy.ObjectMeta.Generation
	policy.Status.LastSyncedAt = metav1.NewTime(time.Now())
	if err := r.Status().Update(ctx, policy); err != nil {
		logger.Error(err, "Failed to update status")
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

func (r *AlertPolicyReconciler) SetupWithManager(mgr ctrl.Manager) error {
	if r.Log.GetSink() == nil {
		r.Log = ctrl.Log.WithName("controllers").WithName("SignalCraftAlertPolicy")
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.SignalCraftAlertPolicy{}).
		Complete(r)
}

type signalcraftPolicyPayload struct {
	Name       string           `json:"name"`
	ExternalID string           `json:"external_id"`
	Severity   string           `json:"severity"`
	RoutingKey string           `json:"routing_key"`
	Conditions []map[string]any `json:"conditions"`
}

func syncAlertPolicy(
	ctx context.Context,
	client *http.Client,
	baseURL string,
	apiKey string,
	policy *v1alpha1.SignalCraftAlertPolicy,
) error {
	payload := signalcraftPolicyPayload{
		Name:       policy.ObjectMeta.Name,
		ExternalID: fmt.Sprintf("%s/%s", policy.ObjectMeta.Namespace, policy.ObjectMeta.Name),
		Severity:   policy.Spec.Severity,
		RoutingKey: policy.Spec.RoutingKey,
		Conditions: []map[string]any{},
	}

	for _, condition := range policy.Spec.Conditions {
		payload.Conditions = append(payload.Conditions, map[string]any{
			"type":     condition.Type,
			"metric":   condition.Metric,
			"operator": condition.Operator,
			"value":    condition.Value,
		})
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/api/alert-policies/upsert", baseURL)
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+apiKey)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set(
		"Idempotency-Key",
		fmt.Sprintf("%s-%d", policy.ObjectMeta.UID, policy.ObjectMeta.Generation),
	)

	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("signalcraft API error: %d", response.StatusCode)
	}

	return nil
}

func deleteAlertPolicy(
	ctx context.Context,
	client *http.Client,
	baseURL string,
	apiKey string,
	policy *v1alpha1.SignalCraftAlertPolicy,
) error {
	externalID := fmt.Sprintf("%s/%s", policy.ObjectMeta.Namespace, policy.ObjectMeta.Name)
	url := fmt.Sprintf("%s/api/alert-policies/external/%s", baseURL, url.PathEscape(externalID))
	request, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+apiKey)
	request.Header.Set(
		"Idempotency-Key",
		fmt.Sprintf("%s-%d-delete", policy.ObjectMeta.UID, policy.ObjectMeta.Generation),
	)

	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode == http.StatusNotFound {
		return nil
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("signalcraft API error: %d", response.StatusCode)
	}

	return nil
}

func containsString(items []string, value string) bool {
	for _, item := range items {
		if item == value {
			return true
		}
	}
	return false
}

func removeString(items []string, value string) []string {
	result := make([]string, 0, len(items))
	for _, item := range items {
		if item != value {
			result = append(result, item)
		}
	}
	return result
}
