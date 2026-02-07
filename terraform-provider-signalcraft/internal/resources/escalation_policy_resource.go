package resources

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/hashicorp/terraform-plugin-framework/diag"
	"github.com/hashicorp/terraform-plugin-framework/path"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/signalcraft/terraform-provider-signalcraft/internal/client"
)

type escalationPolicyResource struct {
	client *client.Client
}

type escalationPolicyModel struct {
	ID          types.String `tfsdk:"id"`
	Name        types.String `tfsdk:"name"`
	Description types.String `tfsdk:"description"`
	RulesJSON   types.String `tfsdk:"rules_json"`
}

type escalationPolicyPayload struct {
	Name        string      `json:"name"`
	Description *string     `json:"description,omitempty"`
	Rules       interface{} `json:"rules"`
}

type escalationPolicyResponse struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description *string     `json:"description"`
	Rules       interface{} `json:"rules"`
}

func NewEscalationPolicyResource() resource.Resource {
	return &escalationPolicyResource{}
}

func (r *escalationPolicyResource) Metadata(
	_ context.Context,
	_ resource.MetadataRequest,
	resp *resource.MetadataResponse,
) {
	resp.TypeName = "signalcraft_escalation_policy"
}

func (r *escalationPolicyResource) Schema(
	_ context.Context,
	_ resource.SchemaRequest,
	resp *resource.SchemaResponse,
) {
	resp.Schema = schema.Schema{
		Attributes: map[string]schema.Attribute{
			"id": schema.StringAttribute{
				Computed: true,
				PlanModifiers: []planmodifier.String{
					stringplanmodifier.UseStateForUnknown(),
				},
			},
			"name": schema.StringAttribute{
				Required: true,
			},
			"description": schema.StringAttribute{
				Optional: true,
			},
			"rules_json": schema.StringAttribute{
				Required:    true,
				Description: "JSON-encoded escalation policy rules.",
			},
		},
	}
}

func (r *escalationPolicyResource) Configure(
	_ context.Context,
	req resource.ConfigureRequest,
	_ *resource.ConfigureResponse,
) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*client.Client)
}

func (r *escalationPolicyResource) Create(
	ctx context.Context,
	req resource.CreateRequest,
	resp *resource.CreateResponse,
) {
	var plan escalationPolicyModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload, diags := buildEscalationPolicyPayload(plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp escalationPolicyResponse
	err := r.client.DoJSON(
		ctx,
		http.MethodPost,
		"/api/escalation-policies",
		payload,
		uuid.NewString(),
		&apiResp,
	)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	state, diags := flattenEscalationPolicy(apiResp)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

func (r *escalationPolicyResource) Read(
	ctx context.Context,
	req resource.ReadRequest,
	resp *resource.ReadResponse,
) {
	var state escalationPolicyModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp escalationPolicyResponse
	err := r.client.DoJSON(
		ctx,
		http.MethodGet,
		fmt.Sprintf("/api/escalation-policies/%s", state.ID.ValueString()),
		nil,
		"",
		&apiResp,
	)
	if err != nil {
		if httpErr, ok := err.(*client.HTTPError); ok && httpErr.StatusCode == http.StatusNotFound {
			resp.State.RemoveResource(ctx)
			return
		}
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	newState, diags := flattenEscalationPolicy(apiResp)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *escalationPolicyResource) Update(
	ctx context.Context,
	req resource.UpdateRequest,
	resp *resource.UpdateResponse,
) {
	var plan escalationPolicyModel
	var state escalationPolicyModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload, diags := buildEscalationPolicyPayload(plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp escalationPolicyResponse
	err := r.client.DoJSON(
		ctx,
		http.MethodPut,
		fmt.Sprintf("/api/escalation-policies/%s", state.ID.ValueString()),
		payload,
		uuid.NewString(),
		&apiResp,
	)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	newState, diags := flattenEscalationPolicy(apiResp)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *escalationPolicyResource) Delete(
	ctx context.Context,
	req resource.DeleteRequest,
	resp *resource.DeleteResponse,
) {
	var state escalationPolicyModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	err := r.client.DoJSON(
		ctx,
		http.MethodDelete,
		fmt.Sprintf("/api/escalation-policies/%s", state.ID.ValueString()),
		nil,
		uuid.NewString(),
		nil,
	)
	if err != nil {
		if httpErr, ok := err.(*client.HTTPError); ok && httpErr.StatusCode == http.StatusNotFound {
			return
		}
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}
}

func (r *escalationPolicyResource) ImportState(
	ctx context.Context,
	req resource.ImportStateRequest,
	resp *resource.ImportStateResponse,
) {
	resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
}

func buildEscalationPolicyPayload(plan escalationPolicyModel) (escalationPolicyPayload, diag.Diagnostics) {
	var diags diag.Diagnostics

	var rules interface{}
	if err := json.Unmarshal([]byte(plan.RulesJSON.ValueString()), &rules); err != nil {
		diags.AddError("Invalid rules_json", err.Error())
		return escalationPolicyPayload{}, diags
	}

	var description *string
	if !plan.Description.IsNull() && !plan.Description.IsUnknown() {
		value := plan.Description.ValueString()
		description = &value
	}

	payload := escalationPolicyPayload{
		Name:        plan.Name.ValueString(),
		Description: description,
		Rules:       rules,
	}

	return payload, diags
}

func flattenEscalationPolicy(apiResp escalationPolicyResponse) (escalationPolicyModel, diag.Diagnostics) {
	var diags diag.Diagnostics

	rulesJSON, err := json.Marshal(apiResp.Rules)
	if err != nil {
		diags.AddError("Failed to serialize rules", err.Error())
		return escalationPolicyModel{}, diags
	}

	state := escalationPolicyModel{
		ID:          types.StringValue(apiResp.ID),
		Name:        types.StringValue(apiResp.Name),
		Description: types.StringPointerValue(apiResp.Description),
		RulesJSON:   types.StringValue(string(rulesJSON)),
	}

	return state, diags
}
