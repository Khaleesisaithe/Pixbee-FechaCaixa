    const FUNDO = 100.00;

    function format(val) {
        return "R$" + val.toFixed(2).replace('.', ',');
    }

    function change(btn, amount) {
        const row = btn.closest('.item-row');
        const input = row.querySelector('.input-term');
        const subtotalCell = row.querySelector('.subtotal-cell');
        const value = parseFloat(row.getAttribute('data-val'));

        let current = parseInt(input.value) + amount;
        if (current < 0) current = 0;
        input.value = current;

        subtotalCell.textContent = format(current * value);
        updateTotals();
    }

    function updateTotals() {
        let totalCedulas = 0;
        let totalMoedas = 0;

        document.querySelectorAll('.col-cedulas .item-row').forEach(row => {
            const val = parseFloat(row.getAttribute('data-val'));
            const qty = parseInt(row.querySelector('.input-term').value);
            totalCedulas += val * qty;
        });

        document.querySelectorAll('.col-moedas .item-row').forEach(row => {
            const val = parseFloat(row.getAttribute('data-val'));
            const qty = parseInt(row.querySelector('.input-term').value);
            totalMoedas += val * qty;
        });

        const totalGeral = totalCedulas + totalMoedas + FUNDO;
        const diferenca = totalCedulas + totalMoedas; // Altere conforme sua lógica desejada

        document.getElementById('res-cedulas').textContent = format(totalCedulas);
        document.getElementById('res-moedas').textContent = format(totalMoedas);
        document.getElementById('res-total').textContent = format(totalGeral);
        document.getElementById('res-diferenca').textContent = format(diferenca);
    }

    function clearAll() {
        document.querySelectorAll('.input-term').forEach(i => i.value = 0);
        document.querySelectorAll('.subtotal-cell').forEach(s => s.textContent = 'R$0,00');
        updateTotals();
    }
