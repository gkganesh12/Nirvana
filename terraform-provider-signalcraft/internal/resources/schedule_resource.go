package resources

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/hashicorp/terraform-plugin-framework/diag"
	"github.com/hashicorp/terraform-plugin-framework/path"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringdefault"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/signalcraft/terraform-provider-signalcraft/internal/client"
)

type scheduleResource struct {
	client *client.Client
}

type scheduleModel struct {
	ID          types.String `tfsdk:"id"`
	Name        types.String `tfsdk:"name"`
	Description types.String `tfsdk:"description"`
	Timezone    types.String `tfsdk:"timezone"`
}

type schedulePayload struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Timezone    *string `json:"timezone,omitempty"`
}

type scheduleResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Timezone    string  `json:"timezone"`
}

func NewScheduleResource() resource.Resource {
	return &scheduleResource{}
}

func (r *scheduleResource) Metadata(
	_ context.Context,
	_ resource.MetadataRequest,
	resp *resource.MetadataResponse,
) {
	resp.TypeName = "signalcraft_schedule"
}

func (r *scheduleResource) Schema(
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
			"timezone": schema.StringAttribute{
				Optional: true,
				Computed: true,
				Default:  stringdefault.StaticString("UTC"),
			},
		},
	}
}

func (r *scheduleResource) Configure(
	_ context.Context,
	req resource.ConfigureRequest,
	_ *resource.ConfigureResponse,
) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*client.Client)
}

func (r *scheduleResource) Create(
	ctx context.Context,
	req resource.CreateRequest,
	resp *resource.CreateResponse,
) {
	var plan scheduleModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload, diags := buildSchedulePayload(plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp scheduleResponse
	err := r.client.DoJSON(ctx, http.MethodPost, "/api/oncall/rotations", payload, uuid.NewString(), &apiResp)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	state := flattenSchedule(apiResp)
	resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

func (r *scheduleResource) Read(
	ctx context.Context,
	req resource.ReadRequest,
	resp *resource.ReadResponse,
) {
	var state scheduleModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp scheduleResponse
	err := r.client.DoJSON(
		ctx,
		http.MethodGet,
		fmt.Sprintf("/api/oncall/rotations/%s", state.ID.ValueString()),
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

	newState := flattenSchedule(apiResp)
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *scheduleResource) Update(
	ctx context.Context,
	req resource.UpdateRequest,
	resp *resource.UpdateResponse,
) {
	var plan scheduleModel
	var state scheduleModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload, diags := buildSchedulePayload(plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp scheduleResponse
	err := r.client.DoJSON(
		ctx,
		http.MethodPut,
		fmt.Sprintf("/api/oncall/rotations/%s", state.ID.ValueString()),
		payload,
		uuid.NewString(),
		&apiResp,
	)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	newState := flattenSchedule(apiResp)
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *scheduleResource) Delete(
	ctx context.Context,
	req resource.DeleteRequest,
	resp *resource.DeleteResponse,
) {
	var state scheduleModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	err := r.client.DoJSON(
		ctx,
		http.MethodDelete,
		fmt.Sprintf("/api/oncall/rotations/%s", state.ID.ValueString()),
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

func (r *scheduleResource) ImportState(
	ctx context.Context,
	req resource.ImportStateRequest,
	resp *resource.ImportStateResponse,
) {
	resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
}

func buildSchedulePayload(plan scheduleModel) (schedulePayload, diag.Diagnostics) {
	var diags diag.Diagnostics

	var description *string
	if !plan.Description.IsNull() && !plan.Description.IsUnknown() {
		value := plan.Description.ValueString()
		description = &value
	}

	var timezone *string
	if !plan.Timezone.IsNull() && !plan.Timezone.IsUnknown() {
		value := plan.Timezone.ValueString()
		timezone = &value
	}

	payload := schedulePayload{
		Name:        plan.Name.ValueString(),
		Description: description,
		Timezone:    timezone,
	}

	return payload, diags
}

func flattenSchedule(apiResp scheduleResponse) scheduleModel {
	return scheduleModel{
		ID:          types.StringValue(apiResp.ID),
		Name:        types.StringValue(apiResp.Name),
		Description: types.StringPointerValue(apiResp.Description),
		Timezone:    types.StringValue(apiResp.Timezone),
	}
}
