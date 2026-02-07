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
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/signalcraft/terraform-provider-signalcraft/internal/client"
)

type userResource struct {
	client *client.Client
}

type userModel struct {
	ID          types.String `tfsdk:"id"`
	UserID      types.String `tfsdk:"user_id"`
	Role        types.String `tfsdk:"role"`
	Email       types.String `tfsdk:"email"`
	DisplayName types.String `tfsdk:"display_name"`
	PhoneNumber types.String `tfsdk:"phone_number"`
}

type userUpdatePayload struct {
	Role string `json:"role"`
}

type userResponse struct {
	ID          string  `json:"id"`
	Email       string  `json:"email"`
	DisplayName *string `json:"displayName"`
	PhoneNumber *string `json:"phoneNumber"`
	Role        string  `json:"role"`
}

func NewUserResource() resource.Resource {
	return &userResource{}
}

func (r *userResource) Metadata(
	_ context.Context,
	_ resource.MetadataRequest,
	resp *resource.MetadataResponse,
) {
	resp.TypeName = "signalcraft_user"
}

func (r *userResource) Schema(
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
			"user_id": schema.StringAttribute{
				Required: true,
			},
			"role": schema.StringAttribute{
				Required: true,
			},
			"email": schema.StringAttribute{
				Computed: true,
			},
			"display_name": schema.StringAttribute{
				Computed: true,
			},
			"phone_number": schema.StringAttribute{
				Computed: true,
			},
		},
	}
}

func (r *userResource) Configure(
	_ context.Context,
	req resource.ConfigureRequest,
	_ *resource.ConfigureResponse,
) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*client.Client)
}

func (r *userResource) Create(
	ctx context.Context,
	req resource.CreateRequest,
	resp *resource.CreateResponse,
) {
	var plan userModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload := userUpdatePayload{Role: plan.Role.ValueString()}
	err := r.client.DoJSON(
		ctx,
		http.MethodPatch,
		fmt.Sprintf("/workspaces/members/%s", plan.UserID.ValueString()),
		payload,
		uuid.NewString(),
		nil,
	)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	state, diags := r.readUserState(ctx, plan.UserID.ValueString())
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

func (r *userResource) Read(
	ctx context.Context,
	req resource.ReadRequest,
	resp *resource.ReadResponse,
) {
	var state userModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	newState, diags := r.readUserState(ctx, state.UserID.ValueString())
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *userResource) Update(
	ctx context.Context,
	req resource.UpdateRequest,
	resp *resource.UpdateResponse,
) {
	var plan userModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload := userUpdatePayload{Role: plan.Role.ValueString()}
	err := r.client.DoJSON(
		ctx,
		http.MethodPatch,
		fmt.Sprintf("/workspaces/members/%s", plan.UserID.ValueString()),
		payload,
		uuid.NewString(),
		nil,
	)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	newState, diags := r.readUserState(ctx, plan.UserID.ValueString())
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *userResource) Delete(
	ctx context.Context,
	req resource.DeleteRequest,
	resp *resource.DeleteResponse,
) {
	var state userModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	err := r.client.DoJSON(
		ctx,
		http.MethodDelete,
		fmt.Sprintf("/workspaces/members/%s", state.UserID.ValueString()),
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

func (r *userResource) ImportState(
	ctx context.Context,
	req resource.ImportStateRequest,
	resp *resource.ImportStateResponse,
) {
	resource.ImportStatePassthroughID(ctx, path.Root("user_id"), req, resp)
}

func (r *userResource) readUserState(
	ctx context.Context,
	userID string,
) (userModel, diag.Diagnostics) {
	var diags diag.Diagnostics
	var users []userResponse
	err := r.client.DoJSON(ctx, http.MethodGet, "/workspaces/members", nil, "", &users)
	if err != nil {
		diags.AddError("API Error", err.Error())
		return userModel{}, diags
	}

	for _, user := range users {
		if user.ID != userID {
			continue
		}

		state := userModel{
			ID:          types.StringValue(user.ID),
			UserID:      types.StringValue(user.ID),
			Role:        types.StringValue(user.Role),
			Email:       types.StringValue(user.Email),
			DisplayName: types.StringPointerValue(user.DisplayName),
			PhoneNumber: types.StringPointerValue(user.PhoneNumber),
		}
		return state, diags
	}

	diags.AddError("User not found", "User is not a member of this workspace")
	return userModel{}, diags
}
