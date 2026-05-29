terraform {
  backend "gcs" {
    bucket = "dativerso-dev-tfstate"
    prefix = "dativerso/dev/infra/terraform"
  }
}