// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { Configuration, OpenAIApi } from "openai";

async function getRepo() {
  const gitExtension = vscode.extensions.getExtension("vscode.git");
  if (!gitExtension) {
    console.error("Git extension not found");
    return;
  }

  const gitApi = gitExtension.exports.getAPI(1);
  if (!gitApi) {
    console.error("Git API not found");
    return;
  }

  // Get git repository
  const gitRepository = gitApi.repositories[0];
  if (!gitRepository) {
    console.error("Git repository not found");
    return;
  }

  return gitRepository;
}

async function getDiff(gitRepository: any) {
  return gitRepository.diff();
}

function splitTextAtCharacterLimit(text: string, limit = 72) {
  const lines = text.split("\n");
  const newLines = lines.map((line) => {
    if (line.length <= limit) {
      return line;
    }

    const words = line.split(" ");
    let newLine = "";
    let currentLineLength = 0;
    for (const word of words) {
      if (currentLineLength + word.length > limit) {
        newLine += "\n";
        currentLineLength = 0;
      }

      newLine += word + " ";
      currentLineLength += word.length;
    }

    return newLine;
  });

  return newLines.join("\n");
}

async function getCommitMessage(diff: string) {
  // Get setting value
  const apiKey = vscode.workspace
    .getConfiguration("fullycommitted")
    .get("apiKey") as string;

  const openai = new OpenAIApi(
    new Configuration({
      apiKey,
    })
  );

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: [
          "Create a commit message for a diff, using the following format:",
          "",
          "[Commit title, no more than 50 characters]",
          "",
          "[Longer commit description]",
          "",
          "For the longer description, make sure lines are no longer than 72 characters.",
          "",
          "Diff:",
          diff,
        ].join("\n"),
      },
    ],
  });

  const commitMessage = completion.data.choices[0].message?.content;
  if (!commitMessage) {
    console.error("No commit message returned");
    return;
  }

  const [title, description] = commitMessage.split("\n\n");
  const formattedMessage = [title, splitTextAtCharacterLimit(description)].join(
    "\n\n"
  );

  return formattedMessage;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  process.env.DEBUG = "openai:api";
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "fullycommitted" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "fullycommitted.generateCommitMessage",
    async () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      console.log("Hello World from FullyCommitted!");

      try {
        const gitRepository = await getRepo();
        const diff = await getDiff(gitRepository);
        const formattedMessage = await getCommitMessage(diff);
        gitRepository.inputBox.value = formattedMessage;
      } catch (error) {
        console.error(error);
      }
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
