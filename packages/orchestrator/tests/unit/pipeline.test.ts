import { describe, it, expect } from "vitest";
import {
  createPipeline,
  advanceStage,
  pausePipeline,
  completePipeline,
  failPipeline,
  findPipelineById,
  findAllPipelines,
} from "../../src/agents/pipeline-service.js";

describe("Pipeline Service", () => {
  it("exports createPipeline function", () => {
    expect(typeof createPipeline).toBe("function");
  });

  it("exports advanceStage function", () => {
    expect(typeof advanceStage).toBe("function");
  });

  it("exports pausePipeline function", () => {
    expect(typeof pausePipeline).toBe("function");
  });

  it("exports completePipeline function", () => {
    expect(typeof completePipeline).toBe("function");
  });

  it("exports failPipeline function", () => {
    expect(typeof failPipeline).toBe("function");
  });

  it("exports findPipelineById function", () => {
    expect(typeof findPipelineById).toBe("function");
  });

  it("exports findAllPipelines function", () => {
    expect(typeof findAllPipelines).toBe("function");
  });
});
