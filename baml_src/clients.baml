// Learn more about clients at https://docs.boundaryml.com/docs/snippets/clients/overview

client<llm> CustomGPT4o {
  provider openai
  options {
    model "gpt-4o"
    api_key env.OPENAI_API_KEY
  }
}

client<llm> CustomGPT4oMini {
  provider openai
  retry_policy Exponential
  options {
    model "gpt-4o-mini"
    api_key env.OPENAI_API_KEY
  }
}

client<llm> CustomSonnet {
  provider anthropic
  options {
    model "claude-3-5-sonnet-20241022"
    api_key env.ANTHROPIC_API_KEY
  }
}


client<llm> CustomHaiku {
  provider anthropic
  retry_policy Constant
  options {
    model "claude-3-haiku-20240307"
    api_key env.ANTHROPIC_API_KEY
  }
}

client<llm> CustomGeminiPro {
  provider google-ai
  options {
    model "gemini-1.5-pro"
    api_key env.GEMINI_API_KEY
  }
}

client<llm> CustomLocalModel {
  provider ollama
  options {
    model "llama3.1"
    api_key env.LOCAL_MODEL_API_KEY
  }
}

// https://docs.boundaryml.com/docs/snippets/clients/fallback
client<llm> CustomPreferredBasedOnCommitMessageQuality {
  provider fallback
  options {
    // This will try the clients in order until one succeeds
    strategy [CustomSonnet, CustomGPT4o, ]
  }
}

// https://docs.boundaryml.com/docs/snippets/clients/retry
retry_policy Constant {
  max_retries 3
  // Strategy is optional
  strategy {
    type constant_delay
    delay_ms 200
  }
}

retry_policy Exponential {
  max_retries 2
  // Strategy is optional
  strategy {
    type exponential_backoff
    delay_ms 300
    mutliplier 1.5
    max_delay_ms 10000
  }
}