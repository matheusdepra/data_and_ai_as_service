locals {
  name_prefix = "dativerso-${var.env}"

  # GCS bucket names are globally unique. Default suffix uses project_id to avoid collisions across projects.
  bucket_suffix_raw = var.resource_suffix != "" ? var.resource_suffix : var.project_id
  # Terraform doesn't provide a built-in regex replace in all runtimes; derive a safe suffix from allowed chunks.
  bucket_suffix = join("-", regexall("[a-z0-9]+", lower(local.bucket_suffix_raw)))

  bucket_landing    = "${local.name_prefix}-${local.bucket_suffix}-dl-landing"
  bucket_quarantine = "${local.name_prefix}-${local.bucket_suffix}-dl-quarantine"
  bucket_bronze     = "${local.name_prefix}-${local.bucket_suffix}-dl-bronze"
  bucket_silver     = "${local.name_prefix}-${local.bucket_suffix}-dl-silver"

  meta_dataset_id = "dv_${var.env}_meta"
}
