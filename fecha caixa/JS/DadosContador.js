const botao = document.getElementById("btnIniciar");

botao.addEventListener("click", iniciarContagem);

function iniciarContagem() {

    // Pegando os dados do formulário
    const dadosCaixa = {

        operador: document.getElementById("operador").value,

        empresa: document.getElementById("empresa").value,

        fundo: document.getElementById("fundo").value,

        observacao: document.getElementById("observacao").value,

        modalidade: document.getElementById("modalidade").value

    };

    // Salva no navegador
    localStorage.setItem(
        "dadosCaixa",
        JSON.stringify(dadosCaixa)
    );

    // Vai para a próxima página
    window.location.href = "contagem.html";

}