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
const initialImmunityPeriod = 1500; // Aumentado para 1.5 segundos para maior segurança no mobile
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

// --- NOVO: Variáveis para controlar os listeners de input ---
let inputListenersActive = true; // Controla se os listeners estão ativos

// Propriedade computada 'didSomething'
function getDidSomething() {
    // Se os listeners não estão ativos ou ainda estamos no período de imunidade total,
    // não houve detecção de "algo" neste momento.
    if (!inputListenersActive || performance.now() < immunityEndTime) {
        return false; // Força "nada" durante a imunidade e desativação de listeners
    }

    const noInputExceptPossibleMouseY =
        !_anyKeyDown &&
        !_mouseButtonDown0 &&
        _touchCount <= 0 &&
        (_acceleration.x === 0 && _acceleration.y === 0 && _acceleration.z === 0) &&
        _mouseAxisX === 0 &&
        !_gamepadAnyButtonPressed &&
        !_gamepadAnyAxisMoved;

    if (noInputExceptPossibleMouseY) {
        return _mouseAxisY !== 0;
    }
    return true;
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

// --- NOVO: Funções para ativar/desativar listeners de input ---
function addInputListeners() {
    if (!inputListenersActive) {
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('touchstart', handleTouchStart, { passive: true }); // Mudar para false se precisar de preventDefault
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchCancel);
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', handleDeviceMotion);
        }
        inputListenersActive = true;
        console.log("Input Listeners ATIVADOS.");
    }
}

function removeInputListeners() {
    if (inputListenersActive) {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchstart', handleTouchStart, { passive: true }); // Usar o mesmo 'passive' que no add
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchCancel);
        if (window.DeviceMotionEvent) {
            window.removeEventListener('devicemotion', handleDeviceMotion);
        }
        inputListenersActive = false;
        console.log("Input Listeners DESATIVADOS.");
    }
}

// --- Handlers de Eventos Separados ---
const handleKeyDown = (e) => {
    _anyKeyDown = true;
    if (e.key === 'Escape') {
        alert("Você pressionou Escape! Em um navegador, não é possível sair da aplicação diretamente.");
        console.log("Escape pressionado.");
    }
};

const handleMouseDown = (e) => {
    if (e.button === 0) {
        _mouseButtonDown0 = true;
    }
};

const handleMouseMove = (e) => {
    _mouseAxisX = e.movementX;
    _mouseAxisY = e.movementY;
};

const handleTouchStart = (e) => {
    _touchCount = e.touches.length;
    // e.preventDefault(); // Descomente se precisar impedir rolagem/zoom ao tocar
};

const handleTouchEnd = (e) => {
    _touchCount = e.touches.length;
};

const handleTouchCancel = (e) => {
    _touchCount = e.touches.length;
};

const handleDeviceMotion = (e) => {
    if (e.accelerationIncludingGravity) {
        _acceleration.x = e.accelerationIncludingGravity.x;
        _acceleration.y = e.accelerationIncludingGravity.y;
        _acceleration.z = e.accelerationIncludingGravity.z;
    }
};


// Lógica de Gamepad
function checkGamepads() {
    // Só verifica gamepads se os listeners de input estão ativos
    if (!inputListenersActive) {
        _gamepadAnyButtonPressed = false;
        _gamepadAnyAxisMoved = false;
        return;
    }

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
    clearAllInputStates();
    addInputListeners(); // Certifica que os listeners estão ativos para iniciar o jogo
}

function atualizar() {
    const tempoAtual = performance.now();
    const deltaTime = tempoAtual - tempoUltimoFrame;
    tempoUltimoFrame = tempoAtual;

    checkGamepads();

    switch (estadoAtual) {
        case EstadosDoJogo.NaoIniciado:
            if (_anyKeyDown || _mouseButtonDown0 || _gamepadAnyButtonPressed || _gamepadAnyAxisMoved || _touchCount > 0) {
                estadoAtual = EstadosDoJogo.EmProgresso;
                tempoUltimaMudancaEstado = tempoAtual;
                immunityEndTime = tempoAtual + initialImmunityPeriod;
                clearAllInputStates(); // Limpa inputs imediatamente
                // Não remove os listeners aqui, eles são necessários para o jogo
                // o 'getDidSomething' cuida da imunidade.
            }
            break;

        case EstadosDoJogo.EmProgresso:
            // DEBUG: Adicione logs para ver o estado da imunidade e do input
            // console.log(`Tempo: ${tempoAtual.toFixed(0)}, Imunidade termina em: ${immunityEndTime.toFixed(0)}, Imunidade ativa: ${tempoAtual < immunityEndTime}`);
            // console.log(`_acceleration: ${JSON.stringify(_acceleration)}, _touchCount: ${_touchCount}`);

            elementoTimer.innerHTML = `Você está fazendo ${textoNada} há\n${formatarTempo(tempoInatividade)}\n`;
            tempoInatividade += deltaTime;

            // A condição de perda agora usa immunityEndTime diretamente no getDidSomething()
            if (getDidSomething()) { // getDidSomething() já verifica immunityEndTime e inputListenersActive
                atualizarScores();
                tempoUltimaMudancaEstado = tempoAtual;
                estadoAtual = EstadosDoJogo.FimDeJogo;
            }
            break;

        case EstadosDoJogo.FimDeJogo:
            elementoTimer.innerHTML =
                `Você fez ${textoAlgo}, você perdeu\n` +
                `Você fez ${textoNada} por ${formatarTempo(ultimoTempoJogada)}\n\n` +
                `Recorde: ${formatarTempo(recordeTempo)}\n\n` +
                `Pressione qualquer tecla ou toque na tela para reiniciar`;

            // Reinicia o jogo apenas após o período de 1 segundo de Game Over
            if (tempoAtual - tempoUltimaMudancaEstado >= 1000 && (_anyKeyDown || _mouseButtonDown0 || _gamepadAnyButtonPressed || _gamepadAnyAxisMoved || _touchCount > 0)) {
                reiniciarJogo();
            }
            break;
    }

    _anyKeyDown = false;
    _mouseButtonDown0 = false;
    _mouseAxisX = 0;
    _mouseAxisY = 0;
    // _touchCount, _acceleration, _gamepadAny... são tratados por seus listeners ou checkGamepads().
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
        reiniciarJogo(); // Isso já chama addInputListeners()
        requestAnimationFrame(gameLoop);
    } else {
        console.error("Elemento com ID 'timerText' não encontrado no HTML. O jogo não pode iniciar.");
    }
});
