import { createInterface } from "node:readline/promises";

export function parseFlags(args) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const [rawKey, inline] = value.slice(2).split("=", 2);
    if (inline !== undefined) {
      flags[rawKey] = inline;
    } else if (args[index + 1] && !args[index + 1].startsWith("--")) {
      flags[rawKey] = args[index + 1];
      index += 1;
    } else {
      flags[rawKey] = true;
    }
  }
  return { positional, flags };
}

export function booleanFlag(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === "true" || value === "yes") return true;
  if (value === false || value === "false" || value === "no") return false;
  throw new Error(`Expected a boolean value, received: ${value}`);
}

export function createPrompter({
  input = process.stdin,
  output = process.stdout,
} = {}) {
  const readline = createInterface({ input, output });
  return {
    async text(label, { defaultValue, validate } = {}) {
      const suffix = defaultValue === undefined ? "" : ` [${defaultValue}]`;
      const answer =
        (await readline.question(`${label}${suffix}: `)).trim() ||
        defaultValue ||
        "";
      validate?.(answer);
      return answer;
    },
    async select(label, choices) {
      output.write(`${label}\n`);
      choices.forEach((choice, index) =>
        output.write(`  ${index + 1}. ${choice.label}\n`),
      );
      const answer = await readline.question("Choose a number: ");
      const selected = choices[Number(answer) - 1];
      if (!selected) throw new Error("Invalid selection.");
      return selected.value;
    },
    async confirm(label, defaultValue = false) {
      const marker = defaultValue ? "Y/n" : "y/N";
      const answer = (await readline.question(`${label} (${marker}): `))
        .trim()
        .toLowerCase();
      if (!answer) return defaultValue;
      if (["y", "yes"].includes(answer)) return true;
      if (["n", "no"].includes(answer)) return false;
      throw new Error("Answer yes or no.");
    },
    close() {
      readline.close();
    },
  };
}
