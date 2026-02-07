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

type invitationResource struct {
	client *client.Client
}

type invitationModel struct {
	ID     types.String `tfsdk:"id"`
	Email  types.String `tfsdk:"email"`
	Role   types.String `tfsdk:"role"`
	Status types.String `tfsdk:"status"`
}

type invitationPayload struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

type invitationResponse struct {
	ID     string `json:"id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	Status string `json:"status"`
}

func NewInvitationResource() resource.Resource {
	return &invitationResource{}
}

func (r *invitationResource) Metadata(
	_ context.Context,
	_ resource.MetadataRequest,
	resp *resource.MetadataResponse,
) {
	resp.TypeName = "signalcraft_invitation"
}

func (r *invitationResource) Schema(
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
			"email": schema.StringAttribute{
				Required: true,
			},
			"role": schema.StringAttribute{
				Optional: true,
			},
			"status": schema.StringAttribute{
				Computed: true,
			},
		},
	}
}

func (r *invitationResource) Configure(
	_ context.Context,
	req resource.ConfigureRequest,
	_ *resource.ConfigureResponse,
) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*client.Client)
}

func (r *invitationResource) Create(
	ctx context.Context,
	req resource.CreateRequest,
	resp *resource.CreateResponse,
) {
	var plan invitationModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload := invitationPayload{
		Email: plan.Email.ValueString(),
		Role:  plan.Role.ValueString(),
	}

	var apiResp invitationResponse
	err := r.client.DoJSON(ctx, http.MethodPost, "/api/invitations", payload, uuid.NewString(), &apiResp)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	state := invitationModel{
		ID:     types.StringValue(apiResp.ID),
		Email:  types.StringValue(apiResp.Email),
		Role:   types.StringValue(apiResp.Role),
		Status: types.StringValue(apiResp.Status),
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

func (r *invitationResource) Read(
	ctx context.Context,
	req resource.ReadRequest,
	resp *resource.ReadResponse,
) {
	var state invitationModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	invitations, diags := r.listInvitations(ctx)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	for _, invite := range invitations {
		if invite.ID == state.ID.ValueString() {
			newState := invitationModel{
				ID:     types.StringValue(invite.ID),
				Email:  types.StringValue(invite.Email),
				Role:   types.StringValue(invite.Role),
				Status: types.StringValue(invite.Status),
			}
			resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
			return
		}
	}

	resp.State.RemoveResource(ctx)
}

func (r *invitationResource) Update(
	_ context.Context,
	_ resource.UpdateRequest,
	resp *resource.UpdateResponse,
) {
	resp.Diagnostics.AddError(
		"Unsupported",
		"Updating invitations is not supported. Recreate the invitation instead.",
	)
}

func (r *invitationResource) Delete(
	ctx context.Context,
	req resource.DeleteRequest,
	resp *resource.DeleteResponse,
) {
	var state invitationModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	err := r.client.DoJSON(
		ctx,
		http.MethodDelete,
		fmt.Sprintf("/api/invitations/%s", state.ID.ValueString()),
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

func (r *invitationResource) ImportState(
	ctx context.Context,
	req resource.ImportStateRequest,
	resp *resource.ImportStateResponse,
) {
	resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
}

func (r *invitationResource) listInvitations(ctx context.Context) ([]invitationResponse, diag.Diagnostics) {
	var diags diag.Diagnostics
	var invites []invitationResponse
	err := r.client.DoJSON(ctx, http.MethodGet, "/api/invitations", nil, "", &invites)
	if err != nil {
		diags.AddError("API Error", err.Error())
		return nil, diags
	}
	return invites, diags
}
