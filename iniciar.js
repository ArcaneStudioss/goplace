// A Discloud exige um arquivo principal .js pra reconhecer o projeto como Node.
// O site de verdade sobe pelo comando START (`npm run start` -> next start na porta 8080).
// Se algum dia o START for ignorado, este arquivo faz a mesma coisa.
process.argv = [process.argv[0], "next", "start", "-p", "8080", "-H", "0.0.0.0"];
require("next/dist/bin/next");
