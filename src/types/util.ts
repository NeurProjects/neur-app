export interface ToolActionResult {
  result?: string;
  message: string;
  addResultUtility?: (result: any) => void;
}
