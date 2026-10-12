import { ComingSoon } from '../components/common/ComingSoon';

export function CodeAssistant() {
  return (
    <ComingSoon
      featureName="Code Assistant"
      description="Ask natural language questions about your codebase. Get answers with citations pointing to the exact source files. Powered by local Ollama models and RAG."
      phase="Phase 3"
    />
  );
}
