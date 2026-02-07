//go:build acceptance

package provider

import (
	"os"
	"testing"

	"github.com/hashicorp/terraform-plugin-framework/providerserver"
	"github.com/hashicorp/terraform-plugin-testing/helper/resource"
)

func TestAccProvider_basic(t *testing.T) {
	if os.Getenv("TF_ACC") == "" {
		t.Skip("TF_ACC not set")
	}

	resource.Test(t, resource.TestCase{
		PreCheck: func() {
			if os.Getenv("SIGNALCRAFT_API_KEY") == "" {
				t.Fatal("SIGNALCRAFT_API_KEY must be set for acceptance tests")
			}
		},
		ProtoV6ProviderFactories: map[string]func() (interface{}, error){
			"signalcraft": providerserver.NewProtocol6WithError(New),
		},
		Steps: []resource.TestStep{},
	})
}
