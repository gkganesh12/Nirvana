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
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/setplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/signalcraft/terraform-provider-signalcraft/internal/client"
)

type teamResource struct {
	client *client.Client
}

type teamModel struct {
	ID          types.String `tfsdk:"id"`
	Name        types.String `tfsdk:"name"`
	Description types.String `tfsdk:"description"`
	Members     types.Set    `tfsdk:"members"`
}

type teamPayload struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

type teamMemberPayload struct {
	UserID string `json:"userId"`
}

type teamResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type teamDetailResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Members     []struct {
		ID string `json:"id"`
	} `json:"members"`
}

func NewTeamResource() resource.Resource {
	return &teamResource{}
}

func (r *teamResource) Metadata(
	_ context.Context,
	_ resource.MetadataRequest,
	resp *resource.MetadataResponse,
) {
	resp.TypeName = "signalcraft_team"
}

func (r *teamResource) Schema(
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
			"members": schema.SetAttribute{
				Optional:    true,
				Computed:    true,
				ElementType: types.StringType,
				PlanModifiers: []planmodifier.Set{
					setplanmodifier.UseStateForUnknown(),
				},
				Description: "Set of user IDs to include in the team.",
			},
		},
	}
}

func (r *teamResource) Configure(
	_ context.Context,
	req resource.ConfigureRequest,
	_ *resource.ConfigureResponse,
) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*client.Client)
}

func (r *teamResource) Create(
	ctx context.Context,
	req resource.CreateRequest,
	resp *resource.CreateResponse,
) {
	var plan teamModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload, diags := buildTeamPayload(plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp teamResponse
	err := r.client.DoJSON(ctx, http.MethodPost, "/api/teams", payload, uuid.NewString(), &apiResp)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	teamID := apiResp.ID
	if !plan.Members.IsNull() && !plan.Members.IsUnknown() {
		memberIDs, diag := expandStringSet(plan.Members)
		resp.Diagnostics.Append(diag...)
		if resp.Diagnostics.HasError() {
			return
		}
		for _, userID := range memberIDs {
			err := r.client.DoJSON(
				ctx,
				http.MethodPost,
				fmt.Sprintf("/api/teams/%s/members", teamID),
				teamMemberPayload{UserID: userID},
				uuid.NewString(),
				nil,
			)
			if err != nil {
				resp.Diagnostics.AddError("API Error", err.Error())
				return
			}
		}
	}

	state, diags := r.readTeamState(ctx, teamID)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

func (r *teamResource) Read(
	ctx context.Context,
	req resource.ReadRequest,
	resp *resource.ReadResponse,
) {
	var state teamModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	newState, diags := r.readTeamState(ctx, state.ID.ValueString())
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *teamResource) Update(
	ctx context.Context,
	req resource.UpdateRequest,
	resp *resource.UpdateResponse,
) {
	var plan teamModel
	var state teamModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload, diags := buildTeamPayload(plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	err := r.client.DoJSON(
		ctx,
		http.MethodPut,
		fmt.Sprintf("/api/teams/%s", state.ID.ValueString()),
		payload,
		uuid.NewString(),
		nil,
	)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	if !plan.Members.IsNull() && !plan.Members.IsUnknown() {
		desired, diag := expandStringSet(plan.Members)
		resp.Diagnostics.Append(diag...)
		if resp.Diagnostics.HasError() {
			return
		}
		existing, diag := expandStringSet(state.Members)
		resp.Diagnostics.Append(diag...)
		if resp.Diagnostics.HasError() {
			return
		}

		toAdd, toRemove := diffStringSets(existing, desired)

		for _, userID := range toAdd {
			err := r.client.DoJSON(
				ctx,
				http.MethodPost,
				fmt.Sprintf("/api/teams/%s/members", state.ID.ValueString()),
				teamMemberPayload{UserID: userID},
				uuid.NewString(),
				nil,
			)
			if err != nil {
				resp.Diagnostics.AddError("API Error", err.Error())
				return
			}
		}

		for _, userID := range toRemove {
			err := r.client.DoJSON(
				ctx,
				http.MethodDelete,
				fmt.Sprintf("/api/teams/%s/members/%s", state.ID.ValueString(), userID),
				nil,
				uuid.NewString(),
				nil,
			)
			if err != nil {
				resp.Diagnostics.AddError("API Error", err.Error())
				return
			}
		}
	}

	newState, diags := r.readTeamState(ctx, state.ID.ValueString())
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *teamResource) Delete(
	ctx context.Context,
	req resource.DeleteRequest,
	resp *resource.DeleteResponse,
) {
	var state teamModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	err := r.client.DoJSON(
		ctx,
		http.MethodDelete,
		fmt.Sprintf("/api/teams/%s", state.ID.ValueString()),
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

func (r *teamResource) ImportState(
	ctx context.Context,
	req resource.ImportStateRequest,
	resp *resource.ImportStateResponse,
) {
	resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
}

func (r *teamResource) readTeamState(
	ctx context.Context,
	teamID string,
) (teamModel, diag.Diagnostics) {
	var diags diag.Diagnostics
	var apiResp teamDetailResponse
	err := r.client.DoJSON(
		ctx,
		http.MethodGet,
		fmt.Sprintf("/api/teams/%s", teamID),
		nil,
		"",
		&apiResp,
	)
	if err != nil {
		diags.AddError("API Error", err.Error())
		return teamModel{}, diags
	}

	members := make([]string, 0, len(apiResp.Members))
	for _, member := range apiResp.Members {
		members = append(members, member.ID)
	}

	membersSet, diag := types.SetValueFrom(ctx, types.StringType, members)
	diags.Append(diag...)
	if diags.HasError() {
		return teamModel{}, diags
	}

	state := teamModel{
		ID:          types.StringValue(apiResp.ID),
		Name:        types.StringValue(apiResp.Name),
		Description: types.StringPointerValue(apiResp.Description),
		Members:     membersSet,
	}

	return state, diags
}

func buildTeamPayload(plan teamModel) (teamPayload, diag.Diagnostics) {
	var diags diag.Diagnostics

	var description *string
	if !plan.Description.IsNull() && !plan.Description.IsUnknown() {
		value := plan.Description.ValueString()
		description = &value
	}

	payload := teamPayload{
		Name:        plan.Name.ValueString(),
		Description: description,
	}

	return payload, diags
}

func expandStringSet(set types.Set) ([]string, diag.Diagnostics) {
	var diags diag.Diagnostics
	if set.IsNull() || set.IsUnknown() {
		return nil, diags
	}

	var values []string
	diags.Append(set.ElementsAs(context.Background(), &values, false)...)
	return values, diags
}

func diffStringSets(current []string, desired []string) (toAdd []string, toRemove []string) {
	currentMap := make(map[string]struct{}, len(current))
	for _, value := range current {
		currentMap[value] = struct{}{}
	}

	desiredMap := make(map[string]struct{}, len(desired))
	for _, value := range desired {
		desiredMap[value] = struct{}{}
		if _, exists := currentMap[value]; !exists {
			toAdd = append(toAdd, value)
		}
	}

	for _, value := range current {
		if _, exists := desiredMap[value]; !exists {
			toRemove = append(toRemove, value)
		}
	}

	return toAdd, toRemove
}
