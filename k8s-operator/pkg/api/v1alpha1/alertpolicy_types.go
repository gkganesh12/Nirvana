package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type AlertPolicySpec struct {
	Severity   string                 `json:"severity"`
	RoutingKey string                 `json:"routing_key"`
	Conditions []AlertPolicyCondition `json:"conditions"`
}

type AlertPolicyCondition struct {
	Type     string  `json:"type"`
	Metric   string  `json:"metric,omitempty"`
	Operator string  `json:"operator,omitempty"`
	Value    float64 `json:"value,omitempty"`
}

type AlertPolicyStatus struct {
	State              string      `json:"state,omitempty"`
	Message            string      `json:"message,omitempty"`
	ObservedGeneration int64       `json:"observedGeneration,omitempty"`
	LastSyncedAt       metav1.Time `json:"lastSyncedAt,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
type SignalCraftAlertPolicy struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AlertPolicySpec   `json:"spec,omitempty"`
	Status AlertPolicyStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
type SignalCraftAlertPolicyList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []SignalCraftAlertPolicy `json:"items"`
}

func init() {
	SchemeBuilder.Register(&SignalCraftAlertPolicy{}, &SignalCraftAlertPolicyList{})
}
