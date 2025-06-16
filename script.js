// script.js

// Definição dos estados do jogo
const EstadosDoJogo = {
    NaoIniciado: 'naoIniciado',
    EmProgresso: 'emProgresso',
    FimDeJogo: 'fimDeJogo'
};

// Variáveis de estado do jogo
let estadoAtual = EstadosDoJogo.NaoIniciado;
let tempoInatividade = 0; // Tempo que o jogador está "fazendo nada" (em milissegundos)
let tempoUltimaMudancaEstado = 0; // Marcação de tempo da última mudança de estado (usando performance.now())
let tempoUltimoFrame = performance.now(); // Para calcular o deltaTime

// Tempo de imunidade total a inputs após o início (em milissegundos)
const initialImmunityPeriod = 2000; // 2 segundos de imunidade ao iniciar
let immunityEndTime = 0;

// NOVAS VARIÁVEIS DE SCORE
let ultimoTempoJogada = 0;
let recordeTempo = 0;
const KEY_ULTIMO_TEMPO = 'nadaGameLastTime';
const KEY_RECORDE_TEMPO = 'nadaGameRecordTime';

// Textos para exibição com cores
const textoNada = "<span style='color:#FFFFFF;'>Nada</span>";
const textoAlgo = "<span style='color:#000000;'>Algo</span>";

// Referência ao elemento HTML onde o timer será exibido
const elementoTimer = document.getElementById('timerText');

// --- Variáveis de Estado do Input (Replicando o Input do Unity) ---
let _anyKeyDown = false;
let _mouseButtonDown0 = false;
let _touchCount = 0;
let _acceleration = { x: 0, y: 0, z: 0 };
let _mouseAxisX = 0;
let _mouseAxisY = 0;
let _gamepadAnyButtonPressed = false;
let _gamepadAnyAxisMoved = false;

// Propriedade computada 'didSomething'
function getDidSomething() {
    // Se ainda estamos no período de imunidade, retorne false imediatamente.
    if (performance.now() < immunityEndTime) {
        return false;
    }

    const noInputExceptPossibleMouseY =
        !_anyKeyDown &&
        !_mouseButtonDown0 &&
        _touchCount <= 0 && // Se houver toques, é algo
        (_acceleration.x === 0 && _acceleration.y === 0 && _acceleration.z === 0) && // Se houver aceleração, é algo
        _mouseAxisX === 0 && // Se houver movimento horizontal do mouse, é algo
        !_gamepadAnyButtonPressed && // Se botão de gamepad pressionado, é algo
        !_gamepadAnyAxisMoved; // Se eixo de gamepad movido, é algo

    // Se tudo acima for "nada", mas o mouseAxisY for diferente de zero, ainda é "algo"
    if (noInputExceptPossibleMouseY) {
        return _mouseAxisY !== 0;
    }
    return true; // Se qualquer outra condição de input for verdadeira, é "algo"
}

// --- Funções Auxiliares para Manipular Input ---

function clearAllInputStates() {
    _anyKeyDown = false;
    _mouseButtonDown0 = false;
    _mouseAxisX = 0;
    _mouseAxisY = 0;
    _touchCount = 0;
    _acceleration = { x: 0, y: 0, z: 0 };
    _gamepadAnyButtonPressed = false;
    _gamepadAnyAxisMoved = false;
}

// --- Event Listeners Globais e Permanentes ---
// Estes listeners são adicionados apenas UMA VEZ no DOMContentLoaded e permanecem ativos.
document.addEventListener('keydown', (e) => {
    _anyKeyDown = true;
    if (e.key === 'Escape') {
        alert("Você pressionou Escape! Em um navegador, não é possível sair da aplicação diretamente.");
        console.log("Escape pressionado.");
    }
});

document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        _mouseButtonDown0 = true;
    }
});

document.addEventListener('mousemove', (e) => {
    _mouseAxisX = e.movementX;
    _mouseAxisY = e.movementY;
});

// Usamos `{ passive: false }` para permitir `e.preventDefault()` no `touchstart` se necessário.
// Isso pode ajudar a evitar que o navegador interprete o toque como uma rolagem/zoom.
document.addEventListener('touchstart', (e) => {
    _touchCount = e.touches.length;
    // e.preventDefault(); // Descomente para impedir rolagem/zoom ao tocar
}, { passive: false });

document.addEventListener('touchend', (e) => {
    _touchCount = e.touches.length;
});
document.addEventListener('touchcancel', (e) => {
    _touchCount = e.touches.length;
});

if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (e) => {
        if (e.accelerationIncludingGravity) {
            _acceleration.x = e.accelerationIncludingGravity.x;
            _acceleration.y = e.accelerationIncludingGravity.y;
            _acceleration.z = e.accelerationIncludingGravity.z;
        }
    });
}

// Lógica de Gamepad
function checkGamepads() {
    const gamepads = navigator.getGamepads();
    _gamepadAnyButtonPressed = false;
    _gamepadAnyAxisMoved = false;

    for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (gamepad) {
            for (let b = 0; b < gamepad.buttons.length; b++) {
                if (gamepad.buttons[b].pressed) {
                    _gamepadAnyButtonPressed = true;
                    break;
                }
            }
            if (_gamepadAnyButtonPressed) break;

            for (let a = 0; a < gamepad.axes.length; a++) {
                const axisValue = gamepad.axes[a];
                if (Math.abs(axisValue) > 0.1) { // Limiar de 0.1 para eixos
                    _gamepadAnyAxisMoved = true;
                    break;
                }
            }
            if (_gamepadAnyAxisMoved) break;
        }
    }
}


// --- Funções de Lógica do Jogo ---

function formatarTempo(tempoMs) {
    let segundosTotal = Math.floor(tempoMs / 1000);
    let dias = Math.floor(segundosTotal / 86400);
    segundosTotal %= 86400;
    let horas = Math.floor(segundosTotal / 3600);
    segundosTotal %= 3600;
    let minutos = Math.floor(segundosTotal / 60);
    let segundos = segundosTotal % 60;

    let texto = "";
    if (dias > 0) {
        texto += `${dias} ${dias === 1 ? "dia" : "dias"}, `;
    }
    if (horas > 0) {
        texto += `${horas} ${horas === 1 ? "hora" : "horas"}, `;
    }
    if (minutos > 0) {
        texto += `${minutos} ${minutos === 1 ? "minuto" : "minutos"}, `;
    }
    return texto + `${segundos} ${segundos === 1 ? "segundo" : "segundos"}`;
}

function carregarScores() {
    const ultimoTempoSalvo = localStorage.getItem(KEY_ULTIMO_TEMPO);
    const recordeTempoSalvo = localStorage.getItem(KEY_RECORDE_TEMPO);

    ultimoTempoJogada = ultimoTempoSalvo ? parseInt(ultimoTempoSalvo) : 0;
    recordeTempo = recordeTempoSalvo ? parseInt(recordeTempoSalvo) : 0;
}

function salvarScores() {
    localStorage.setItem(KEY_ULTIMO_TEMPO, ultimoTempoJogada.toString());
    localStorage.setItem(KEY_RECORDE_TEMPO, recordeTempo.toString());
}

function atualizarScores() {
    ultimoTempoJogada = tempoInatividade;
    if (tempoInatividade > recordeTempo) {
        recordeTempo = tempoInatividade;
    }
    salvarScores();
}

function reiniciarJogo() {
    estadoAtual = EstadosDoJogo.NaoIniciado;
    tempoInatividade = 0;
    elementoTimer.innerHTML =
        `Pressione qualquer tecla ou toque na tela para começar a fazer ${textoNada}\n\n` +
        `Última jogada: ${formatarTempo(ultimoTempoJogada)}\n` +
        `Recorde: ${formatarTempo(recordeTempo)}`;
    tempoUltimaMudancaEstado = performance.now();
    tempoUltimoFrame = performance.now();
    immunityEndTime = 0; // Garante que a imunidade não esteja ativa
    clearAllInputStates(); // **IMPORTANTE**: Limpa os estados de input para a tela inicial
}

function atualizar() {
    const tempoAtual = performance.now();
    const deltaTime = tempoAtual - tempoUltimoFrame;
    tempoUltimoFrame = tempoAtual;

    checkGamepads(); // Verifica gamepads a cada frame

    switch (estadoAtual) {
        case EstadosDoJogo.NaoIniciado:
            // AQUI É A CHAVE: O jogo só inicia se QUALQUER input for detectado
            // e os estados de input são resetados no final de CADA frame para serem "fresh" no próximo.
            if (_anyKeyDown || _mouseButtonDown0 || _gamepadAnyButtonPressed || _gamepadAnyAxisMoved || _touchCount > 0) {
                estadoAtual = EstadosDoJogo.EmProgresso;
                tempoUltimaMudancaEstado = tempoAtual;
                immunityEndTime = tempoAtual + initialImmunityPeriod;
                clearAllInputStates(); // Limpa TODOS os inputs novamente, imediatamente após a transição
                console.log("Jogo INICIADO. Imunidade até:", immunityEndTime); // Log para depuração
            }
            break;

        case EstadosDoJogo.EmProgresso:
            elementoTimer.innerHTML = `Você está fazendo ${textoNada} há\n${formatarTempo(tempoInatividade)}\n`;
            tempoInatividade += deltaTime;

            if (getDidSomething()) { // getDidSomething() já verifica immunityEndTime
                atualizarScores();
                tempoUltimaMudancaEstado = tempoAtual;
                estadoAtual = EstadosDoJogo.FimDeJogo;
                console.log("Jogo PERDIDO. Tempo:", tempoInatividade); // Log para depuração
            }
            break;

        case EstadosDoJogo.FimDeJogo:
            elementoTimer.innerHTML =
                `Você fez ${textoAlgo}, você perdeu\n` +
                `Você fez ${textoNada} por ${formatarTempo(ultimoTempoJogada)}\n\n` +
                `Recorde: ${formatarTempo(recordeTempo)}\n\n` +
                `Pressione qualquer tecla ou toque na tela para reiniciar`;

            // Permite reiniciar após 1 segundo de "Game Over"
            if (tempoAtual - tempoUltimaMudancaEstado >= 1000 &&
               (_anyKeyDown || _mouseButtonDown0 || _gamepadAnyButtonPressed || _gamepadAnyAxisMoved || _touchCount > 0)) {
                reiniciarJogo();
                console.log("Jogo REINICIADO."); // Log para depuração
            }
            break;
    }

    // --- REAJUSTE CRÍTICO: Resetar _anyKeyDown, _mouseButtonDown0, _mouseAxis no FINAL do frame ---
    // Isso garante que eles capturem o input de *cada* frame.
    _anyKeyDown = false;
    _mouseButtonDown0 = false;
    _mouseAxisX = 0;
    _mouseAxisY = 0;
    // _touchCount, _acceleration, _gamepadAny... são tratados por seus listeners ou checkGamepads()
    // e devem ser zerados por clearAllInputStates() na transição, não aqui.
}

// --- Loop Principal do Jogo ---
function gameLoop() {
    atualizar();
    requestAnimationFrame(gameLoop);
}

// --- Inicialização do Jogo ---
document.addEventListener('DOMContentLoaded', () => {
    if (elementoTimer) {
        carregarScores();
        reiniciarJogo(); // Inicia o jogo na tela de "NaoIniciado"
        requestAnimationFrame(gameLoop); // Inicia o loop do jogo
    } else {
        console.error("Elemento com ID 'timerText' não encontrado no HTML. O jogo não pode iniciar.");
    }
});
