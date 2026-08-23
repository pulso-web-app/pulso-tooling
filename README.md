# Pulso Tooling

Workspace e automações de desenvolvimento para `pulso-shell`, `pulso-crm` e
`pulso-projects`. Este repositório não é um workspace Nx e não compartilha
dependências entre os aplicativos.

## Primeiro uso

Clone este repositório dentro de uma pasta `pulso` e execute:

```bash
npm run setup
npm run doctor
npm run open
```

O setup clona somente os repositórios ausentes, confirma os remotes dos
diretórios existentes e executa `npm ci`. Ele nunca faz `pull`, checkout ou
sobrescrita de working trees.

## Uso no VS Code

Abra `pulso.code-workspace` e use `Terminal > Run Task`. As tasks com prefixo
`Pulso:` permitem subir um ou todos os apps, executar verificações e gerar
artefatos Angular.

Para gerar código, abra um arquivo na pasta de destino e execute uma das tasks
de geração. Informe apenas `nome` ou `subpasta/nome`; o tooling aplica o sufixo
correto e bloqueia caminhos fora de `apps/<app>/src/app`.

## Comandos de terminal

```bash
npm run dev            # serve os três apps
npm run dev:shell      # serve apenas o shell
npm run dev:crm
npm run dev:projects
npm run build
npm run lint
npm run test:apps
npm run e2e
npm run check
```

## Portas

| App      | Porta |
| -------- | ----: |
| Shell    |  4200 |
| CRM      |  4201 |
| Projects |  4202 |

## Requisitos

- Git e npm disponíveis no `PATH`.
- Node `^22.22.3`, `^24.15.0` ou `^26.0.0`.
- VS Code com as extensões recomendadas pelo workspace.

O Nx Console é útil para explorar projetos e generators. As tasks deste repo
são a interface estável quando a extensão exibir somente um workspace Nx por
vez em uma janela multi-root.
