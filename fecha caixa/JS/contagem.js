// ======================================
// CONTAGEM.JS
// ======================================

// Recupera os dados da página anterior
const dadosCaixa = JSON.parse(localStorage.getItem("dadosCaixa"));

if (!dadosCaixa) {
    alert("Nenhuma contagem iniciada.");
    window.location.href = "dados.html";
}

// Exibe os dados iniciais
atualizarTela();

// Sempre que algum campo mudar, recalcula
document.querySelectorAll("input").forEach(campo => {
    campo.addEventListener("input", calcularTotal);
});

// Faz o primeiro cálculo
calcularTotal();


// ======================================
// Calcula todas as moedas
// ======================================

function calcularMoedas() {

    let totalMoedas = 0;

    totalMoedas += (Number(document.getElementById("m005").value) || 0) * 0.05;
    totalMoedas += (Number(document.getElementById("m010").value) || 0) * 0.10;
    totalMoedas += (Number(document.getElementById("m025").value) || 0) * 0.25;
    totalMoedas += (Number(document.getElementById("m050").value) || 0) * 0.50;
    totalMoedas += (Number(document.getElementById("m100").value) || 0) * 1.00;

    return totalMoedas;

}


// ======================================
// Calcula todas as cédulas
// ======================================

function calcularCedulas() {

    let totalCedulas = 0;

    totalCedulas += (Number(document.getElementById("n2").value) || 0) * 2;
    totalCedulas += (Number(document.getElementById("n5").value) || 0) * 5;
    totalCedulas += (Number(document.getElementById("n10").value) || 0) * 10;
    totalCedulas += (Number(document.getElementById("n20").value) || 0) * 20;
    totalCedulas += (Number(document.getElementById("n50").value) || 0) * 50;
    totalCedulas += (Number(document.getElementById("n100").value) || 0) * 100;
    totalCedulas += (Number(document.getElementById("n200").value) || 0) * 200;

    return totalCedulas;

}


// ======================================
// Calcula o valor total
// ======================================

function calcularTotal() {

    const moedas = calcularMoedas();

    const cedulas = calcularCedulas();

    const total = moedas + cedulas;

    document.getElementById("total").textContent =
        total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

}


// ======================================
// Atualiza as informações da tela
// ======================================

function atualizarTela() {

    document.getElementById("operador").textContent =
        dadosCaixa.operador;

    document.getElementById("empresa").textContent =
        dadosCaixa.empresa;

    document.getElementById("fundo").textContent =
        Number(dadosCaixa.fundo).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

}