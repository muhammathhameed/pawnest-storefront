export class ProductPipelineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductPipelineValidationError";
  }
}

export class ProductPipelineConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductPipelineConfigurationError";
  }
}

export class ProductPipelineSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductPipelineSyncError";
  }
}
