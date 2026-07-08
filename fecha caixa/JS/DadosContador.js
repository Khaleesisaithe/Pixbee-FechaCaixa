console.log("DadosContador.js carregado");


const botao = document.getElementById("btnIniciar");

const mensagemErro = document.getElementById("mensagemErro");

const backdropErro = document.getElementById("backdropErro");


let erros = [];

let tempoMensagem;



botao.addEventListener("click", iniciarContagem);



function iniciarContagem(event) {

    event.preventDefault();


    erros = [];


    const operador = document.getElementById("operador").value.trim();

    const empresa = document.getElementById("nome-empresa").value.trim();

    const fundo = document.getElementById("valor-inicial").value.trim();

    const observacao = document.getElementById("observacoes").value.trim();


    const modalidade = document.querySelector(
        'input[name="tipo_contagem"]:checked'
    );



    // ==========================
    // VALIDAÇÃO DOS CAMPOS
    // ==========================


    if (operador === "") {

        erros.push("Nome do operador");

    }


    if (empresa === "") {

        erros.push("Nome da empresa");

    }


    if (fundo === "") {

        erros.push("Valor do fundo de caixa");

    }


    if (observacao === "") {

        erros.push("Observação do turno");

    }


    if (!modalidade) {

        erros.push("Modalidade de contagem");

    }




    // ==========================
    // MOSTRA OVERLAY DE ERRO
    // ==========================


    if (erros.length > 0) {


        mensagemErro.innerHTML = `

        <strong>
        ⚠️ Dados incompletos
        </strong>

        <p>
        Complete os campos obrigatórios:
        </p>

        <ul>
            ${erros.map(item => `<li>${item}</li>`).join("")}
        </ul>

        `;



        // limpa animações antigas

        mensagemErro.classList.remove("sair");

        backdropErro.classList.remove("sair");



        // mostra aviso

        mensagemErro.classList.add("mostrar");

        backdropErro.classList.add("mostrar");



        // evita vários timers ao mesmo tempo

        clearTimeout(tempoMensagem);



        tempoMensagem = setTimeout(() => {


            // inicia saída

            mensagemErro.classList.remove("mostrar");

            mensagemErro.classList.add("sair");



            backdropErro.classList.remove("mostrar");

            backdropErro.classList.add("sair");



            // limpa classes depois da animação

            setTimeout(() => {


                mensagemErro.classList.remove("sair");

                backdropErro.classList.remove("sair");


            }, 500);



        }, 4000);



        return;

    }




    // ==========================
    // SALVA OS DADOS
    // ==========================


    const dadosCaixa = {


        operador,

        empresa,

        fundo,

        observacao,

        modalidade: modalidade.value


    };



    localStorage.setItem(

        "dadosCaixa",

        JSON.stringify(dadosCaixa)

    );



    console.log("Dados salvos:", dadosCaixa);



    window.location.href = "contagem.html";


}