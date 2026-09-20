import type { PipelineStep } from "./steps";

export const pipelineIntro =
  "A four-stage Streamlit app for cleaning, exploring, and exporting tabular data. Upload any CSV or Excel file, apply transformations with a live audit trail, then export the cleaned dataset or generate a Quarto report template.";

export const pipelineRepoUrl = "https://github.com/Jaywhy-webber/data-cleaning-pipeline";

export const pipelineSteps: PipelineStep[] = [
  {
    label: "Ingest",
    description:
      "Upload CSV or Excel; auto-detect headers, preview raw rows, and review column types, null counts, and duplicates before proceeding",
  },
  {
    label: "Clean",
    description:
      "Fill or drop nulls, remove duplicates, fix data types, rename columns, filter rows, and normalise strings, every operation appended to an audit log",
  },
  {
    label: "EDA",
    description:
      "Auto-generated Plotly charts: distributions, missing-value heatmaps, Pearson correlation matrices, and outlier boxplots across all columns",
  },
  {
    label: "Export",
    description:
      "Download as CSV or multi-sheet Excel, or generate a Quarto report template pre-populated with before/after tables and visualisation boilerplate",
  },
];

/**
 * Contents of the bordered "Sample output" box under the diagram.
 * Null until the real export/audit-log excerpt is supplied — the box is not
 * rendered rather than showing invented output.
 */
export const pipelineSampleOutput: string | null = null;
