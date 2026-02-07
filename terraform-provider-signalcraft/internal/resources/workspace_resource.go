package resources

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/hashicorp/terraform-plugin-framework/path"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/planmodifier"
	"github.com/hashicorp/terraform-plugin-framework/resource/schema/stringplanmodifier"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/signalcraft/terraform-provider-signalcraft/internal/client"
)

type workspaceResource struct {
	client *client.Client
}

type workspaceModel struct {
	ID   types.String `tfsdk:"id"`
	Name types.String `tfsdk:"name"`
}

type workspaceResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type workspaceUpdatePayload struct {
	Name string `json:"name"`
}

func NewWorkspaceResource() resource.Resource {
	return &workspaceResource{}
}

func (r *workspaceResource) Metadata(
	_ context.Context,
	_ resource.MetadataRequest,
	resp *resource.MetadataResponse,
) {
	resp.TypeName = "signalcraft_workspace"
}

func (r *workspaceResource) Schema(
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
		},
	}
}

func (r *workspaceResource) Configure(
	_ context.Context,
	req resource.ConfigureRequest,
	_ *resource.ConfigureResponse,
) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*client.Client)
}

func (r *workspaceResource) Create(
	ctx context.Context,
	req resource.CreateRequest,
	resp *resource.CreateResponse,
) {
	var plan workspaceModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload := workspaceUpdatePayload{Name: plan.Name.ValueString()}
	err := r.client.DoJSON(ctx, http.MethodPut, "/settings/workspace", payload, uuid.NewString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	var apiResp workspaceResponse
	err = r.client.DoJSON(ctx, http.MethodGet, "/settings/workspace", nil, "", &apiResp)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	state := workspaceModel{
		ID:   types.StringValue(apiResp.ID),
		Name: types.StringValue(apiResp.Name),
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &state)...)
}

func (r *workspaceResource) Read(
	ctx context.Context,
	req resource.ReadRequest,
	resp *resource.ReadResponse,
) {
	var state workspaceModel
	resp.Diagnostics.Append(req.State.Get(ctx, &state)...)
	if resp.Diagnostics.HasError() {
		return
	}

	var apiResp workspaceResponse
	err := r.client.DoJSON(ctx, http.MethodGet, "/settings/workspace", nil, "", &apiResp)
	if err != nil {
		if httpErr, ok := err.(*client.HTTPError); ok && httpErr.StatusCode == http.StatusNotFound {
			resp.State.RemoveResource(ctx)
			return
		}
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	newState := workspaceModel{
		ID:   types.StringValue(apiResp.ID),
		Name: types.StringValue(apiResp.Name),
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *workspaceResource) Update(
	ctx context.Context,
	req resource.UpdateRequest,
	resp *resource.UpdateResponse,
) {
	var plan workspaceModel
	resp.Diagnostics.Append(req.Plan.Get(ctx, &plan)...)
	if resp.Diagnostics.HasError() {
		return
	}

	payload := workspaceUpdatePayload{Name: plan.Name.ValueString()}
	err := r.client.DoJSON(ctx, http.MethodPut, "/settings/workspace", payload, uuid.NewString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	var apiResp workspaceResponse
	err = r.client.DoJSON(ctx, http.MethodGet, "/settings/workspace", nil, "", &apiResp)
	if err != nil {
		resp.Diagnostics.AddError("API Error", err.Error())
		return
	}

	newState := workspaceModel{
		ID:   types.StringValue(apiResp.ID),
		Name: types.StringValue(apiResp.Name),
	}
	resp.Diagnostics.Append(resp.State.Set(ctx, &newState)...)
}

func (r *workspaceResource) Delete(
	_ context.Context,
	_ resource.DeleteRequest,
	_ *resource.DeleteResponse,
) {
	return
}

func (r *workspaceResource) ImportState(
	ctx context.Context,
	req resource.ImportStateRequest,
	resp *resource.ImportStateResponse,
) {
	resource.ImportStatePassthroughID(ctx, path.Root("id"), req, resp)
}
