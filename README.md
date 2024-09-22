# AI-Powered Git Commit Message Generator

## Overview

This project is a TypeScript-based tool that leverages AI to automatically generate meaningful and descriptive commit
messages for your Git repositories. By analyzing the differences in your code and understanding the context of your
changes, it produces high-quality commit messages that save time and improve the overall quality of your version
control history.

## Features

- **Automated Commit Message Generation**: Uses AI to create informative commit messages based on your code changes.
- **Git Integration**: Seamlessly interacts with your local Git repository to fetch diffs and status.
- **Anthropic API Integration**: Utilizes the Anthropic AI model for natural language processing and generation.
- **Customizable Prompts**: Allows for tailored AI interactions through customizable prompt templates.
- **Robust Error Handling**: Implements a comprehensive error management system for reliable operation.
- **Logging**: Includes a logging system for tracking operations and debugging.

## How It Works

1. The tool analyzes your Git repository's current state and diffs.
2. It sends this information to the Anthropic AI model along with carefully crafted prompts.
3. The AI generates a commit message based on the provided context.
4. The generated message can then be used for your Git commit.

## Project Structure

- `src/`: Main source directory
  - `git/`: Handles Git operations (commit, diff, status)
  - `llms/`: Manages AI interactions, specifically for commit message generation
  - `prompts/`: Contains templates for AI prompts
  - `config.ts`: Configuration management
  - `errors.ts`: Error handling utilities
  - `logger.ts`: Logging functionality
  - `main.ts`: Main application logic
  - `types.ts`: TypeScript type definitions

## Getting Started

(Include installation and usage instructions here)

## Configuration

(Explain how to configure the tool, including any API keys needed for Anthropic)

## Contributing

(Add guidelines for contributing to the project)

## License

(Include license information)
