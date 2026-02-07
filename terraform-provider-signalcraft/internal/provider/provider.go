package provider

import (
	"context"
	"os"

	"github.com/hashicorp/terraform-plugin-framework/datasource"
	"github.com/hashicorp/terraform-plugin-framework/diag"
	"github.com/hashicorp/terraform-plugin-framework/provider"
	"github.com/hashicorp/terraform-plugin-framework/provider/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/types"
	"github.com/hashicorp/terraform-plugin-log/tflog"
	"github.com/signalcraft/terraform-provider-signalcraft/internal/client"
	"github.com/signalcraft/terraform-provider-signalcraft/internal/resources"
)

type signalcraftProvider struct{}

type providerModel struct {
	BaseURL types.String `tfsdk:"base_url"`
	APIKey  types.String `tfsdk:"api_key"`
}

func New() provider.Provider {
	return &signalcraftProvider{}
}

func (p *signalcraftProvider) Metadata(_ context.Context, _ provider.MetadataRequest, resp *provider.MetadataResponse) {
	resp.TypeName = "signalcraft"
}

func (p *signalcraftProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
	resp.Schema = schema.Schema{
		Attributes: map[string]schema.Attribute{
			"base_url": schema.StringAttribute{
				Optional:    true,
				Description: "SignalCraft API base URL. Defaults to SIGNALCRAFT_API_URL or http://localhost:5050.",
			},
			"api_key": schema.StringAttribute{
				Optional:    true,
				Sensitive:   true,
				Description: "SignalCraft API key. Defaults to SIGNALCRAFT_API_KEY.",
			},
		},
	}
}

func (p *signalcraftProvider) Configure(
	ctx context.Context,
	req provider.ConfigureRequest,
	resp *provider.ConfigureResponse,
) {
	var config providerModel
	resp.Diagnostics.Append(req.Config.Get(ctx, &config)...)
	if resp.Diagnostics.HasError() {
		return
	}

	baseURL := config.BaseURL.ValueString()
	if baseURL == "" {
		baseURL = os.Getenv("SIGNALCRAFT_API_URL")
	}
	if baseURL == "" {
		baseURL = "http://localhost:5050"
	}

	apiKey := config.APIKey.ValueString()
	if apiKey == "" {
		apiKey = os.Getenv("SIGNALCRAFT_API_KEY")
	}
	if apiKey == "" {
		resp.Diagnostics.Append(diag.NewErrorDiagnostic(
			"Missing API Key",
			"Set api_key in provider configuration or SIGNALCRAFT_API_KEY.",
		))
		return
	}

	tflog.Debug(ctx, "Configuring SignalCraft client", map[string]any{
		"base_url": baseURL,
	})

	apiClient := client.New(baseURL, apiKey)
	resp.DataSourceData = apiClient
	resp.ResourceData = apiClient
}

func (p *signalcraftProvider) Resources(_ context.Context) []func() resource.Resource {
	return []func() resource.Resource{
		resources.NewWorkspaceResource,
		resources.NewUserResource,
		resources.NewInvitationResource,
		resources.NewRoutingRuleResource,
		resources.NewEscalationPolicyResource,
		resources.NewTeamResource,
		resources.NewScheduleResource,
	}
}

func (p *signalcraftProvider) DataSources(_ context.Context) []func() datasource.DataSource {
	return nil
}
