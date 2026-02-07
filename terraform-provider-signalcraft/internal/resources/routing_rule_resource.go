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
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/booldefault"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/int64planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/signalcraft/terraform-provider-signalcraft/internal/client"
)

type routingRuleResource struct {
	client *client.Client
}

type routingRuleModel struct {
	ID             types.String `tfsdk:"id"`
	Name           types.String `tfsdk:"name"`
	Description    types.String `tfsdk:"description"`
	Enabled        types.Bool   `tfsdk:"enabled"`
	Priority       types.Int64  `tfsdk:"priority"`
	ConditionsJSON types.String `tfsdk:"conditions_json"`
	ActionsJSON    types.String `tfsdk:"actions_json"`
}

type routingRulePayload struct {
	Name        string      `json:"name"`
	Description *string     `json:"description,omitempty"`
	Enabled     *bool       `json:"enabled,omitempty"`
	Priority    *int64      `json:"priority,omitempty"`
	Conditions  interface{} `json:"conditions"`
	Actions     interface{} `json:"actions"`
}

type routingRuleResponse struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description *string     `json:"description"`
	Enabled     bool        `json:"enabled"`
	Priority    int64       `json:"priority"`
	Conditions  interface{} `json:"conditions"`
	Actions     interface{} `json:"actions"`
}

func NewRoutingRuleResource() resource.Resource {
	return &routingRuleResource{}
}

func (r *routingRuleResource) Metadata(
	_ context.Context,
	_ resource.MetadataRequest,
	resp *resource.MetadataResponse,
) {
	resp.TypeName = "signalcraft_routing_rule"
}

func (r *routingRuleResource) Schema(
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
			"enabled": schema.BoolAttribute{
				Optional: true,
				Computed: true,
				Default:  booldefault.StaticBool(true),
			},
			"priority": schema.Int64Attribute{
				Optional: true,
				Computed: true,
				PlanModifiers: []planmodifier.Int64{
					int64planmodifier.UseStateForUnknown(),
				},
			},
			"conditions_json": schema.StringAttribute{
				Required:    true,
				Description: "JSON-encoded conditions object. Use jsonencode() in Terraform.",
			},
			"actions_json": schema.StringAttribute{
				Required:    true,
				Description: "JSON-encoded actions object. Use jsonencode() in Terraform.",
			},
		},
	}
}

func (r *routingRuleResource) Configure(
	_ context.Context,
	req resource.ConfigureRequest,
	_ *resource.ConfigureResponse,
) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*client.Client)
}

func (r *routingRuleResource) Create(
	ctx context.Context,
	req resource.CreateRequest,
	resp *resource.CreateResponse,
) {
	var plan routingRuleModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload, diags := buildRoutingPayload(plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp routingRuleResponse
	err := r.client.DoJSON(ctx, http.MethodPost, "/api/routing-rules", payload, uuid.NewString(), &apiResp)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	state, diags := flattenRoutingRule(apiResp)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

func (r *routingRuleResource) Read(
	ctx context.Context,
	req resource.ReadRequest,
	resp *resource.ReadResponse,
) {
	var state routingRuleModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp routingRuleResponse
	err := r.client.DoJSON(ctx, http.MethodGet, fmt.Sprintf("/api/routing-rules/%s", state.ID.ValueString()), nil, "", &apiResp)
	if err != nil {
		if httpErr, ok := err.(*client.HTTPError); ok && httpErr.StatusCode == http.StatusNotFound {
			resp.State.RemoveResource(ctx)
			return
		}
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	newState, diags := flattenRoutingRule(apiResp)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *routingRuleResource) Update(
	ctx context.Context,
	req resource.UpdateRequest,
	resp *resource.UpdateResponse,
) {
	var plan routingRuleModel
	var state routingRuleModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload, diags := buildRoutingPayload(plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp routingRuleResponse
	err := r.client.DoJSON(
		ctx,
		http.MethodPut,
		fmt.Sprintf("/api/routing-rules/%s", state.ID.ValueString()),
		payload,
		uuid.NewString(),
		&apiResp,
	)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	newState, diags := flattenRoutingRule(apiResp)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *routingRuleResource) Delete(
	ctx context.Context,
	req resource.DeleteRequest,
	resp *resource.DeleteResponse,
) {
	var state routingRuleModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	err := r.client.DoJSON(
		ctx,
		http.MethodDelete,
		fmt.Sprintf("/api/routing-rules/%s", state.ID.ValueString()),
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

func (r *routingRuleResource) ImportState(
	ctx context.Context,
	req resource.ImportStateRequest,
	resp *resource.ImportStateResponse,
) {
	resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
}

func buildRoutingPayload(plan routingRuleModel) (routingRulePayload, diag.Diagnostics) {
	var diags diag.Diagnostics

	var conditions interface{}
	if err := json.Unmarshal([]byte(plan.ConditionsJSON.ValueString()), &conditions); err != nil {
		diags.AddError("Invalid conditions_json", err.Error())
		return routingRulePayload{}, diags
	}

	var actions interface{}
	if err := json.Unmarshal([]byte(plan.ActionsJSON.ValueString()), &actions); err != nil {
		diags.AddError("Invalid actions_json", err.Error())
		return routingRulePayload{}, diags
	}

	var description *string
	if !plan.Description.IsNull() && !plan.Description.IsUnknown() {
		value := plan.Description.ValueString()
		description = &value
	}

	var enabled *bool
	if !plan.Enabled.IsNull() && !plan.Enabled.IsUnknown() {
		value := plan.Enabled.ValueBool()
		enabled = &value
	}

	var priority *int64
	if !plan.Priority.IsNull() && !plan.Priority.IsUnknown() {
		value := plan.Priority.ValueInt64()
		priority = &value
	}

	payload := routingRulePayload{
		Name:        plan.Name.ValueString(),
		Description: description,
		Enabled:     enabled,
		Priority:    priority,
		Conditions:  conditions,
		Actions:     actions,
	}

	return payload, diags
}

func flattenRoutingRule(apiResp routingRuleResponse) (routingRuleModel, diag.Diagnostics) {
	var diags diag.Diagnostics

	conditionsJSON, err := json.Marshal(apiResp.Conditions)
	if err != nil {
		diags.AddError("Failed to serialize conditions", err.Error())
		return routingRuleModel{}, diags
	}
	actionsJSON, err := json.Marshal(apiResp.Actions)
	if err != nil {
		diags.AddError("Failed to serialize actions", err.Error())
		return routingRuleModel{}, diags
	}

	state := routingRuleModel{
		ID:             types.StringValue(apiResp.ID),
		Name:           types.StringValue(apiResp.Name),
		Description:    types.StringPointerValue(apiResp.Description),
		Enabled:        types.BoolValue(apiResp.Enabled),
		Priority:       types.Int64Value(apiResp.Priority),
		ConditionsJSON: types.StringValue(string(conditionsJSON)),
		ActionsJSON:    types.StringValue(string(actionsJSON)),
	}

	return state, diags
}
