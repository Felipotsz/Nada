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
const initialImmunityPeriod = 2000; // Aumentado para 2 segundos para máxima segurança no mobile
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
// Estes serão atualizados pelos listeners, mas a lógica de início usará um método diferente.
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

// --- NOVO: Handler de Input Único para Início/Reinício ---
function handleGameStartInput() {
    // Esta função será chamada por qualquer input no estado NaoIniciado ou FimDeJogo
    if (estadoAtual === EstadosDoJogo.NaoIniciado || estadoAtual === EstadosDoJogo.FimDeJogo) {
        // Apenas para evitar múltiplos reinícios instantâneos no FimDeJogo
        if (estadoAtual === EstadosDoJogo.FimDeJogo && (performance.now() - tempoUltimaMudancaEstado < 1000)) {
            return;
        }

        estadoAtual = EstadosDoJogo.EmProgresso;
        tempoUltimaMudancaEstado = performance.now();
        immunityEndTime = performance.now() + initialImmunityPeriod;
        tempoInatividade = 0; // Zera o tempo de inatividade para a nova jogada
        clearAllInputStates(); // Limpa todos os inputs após o início

        // Remove este listener temporário para evitar que ele interfira na lógica do jogo
        document.removeEventListener('keydown', handleGameStartInput);
        document.removeEventListener('mousedown', handleGameStartInput);
        document.removeEventListener('touchstart', handleGameStartInput);
        // Não removemos mousemove, devicemotion, gamepad pois eles são contínuos e não "disparam" o início
    }
}

// --- Event Listeners Globais e Permanentes ---
// Estes listeners atualizam as variáveis _anyKeyDown, _mouseAxis, etc.
// Eles permanecem ativos durante todo o ciclo de vida do jogo.
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

document.addEventListener('touchstart', (e) => {
    _touchCount = e.touches.length;
    // e.preventDefault(); // Descomente se precisar impedir rolagem/zoom ao tocar
}, { passive: true });

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

// --- NOVA Função para Configurar Listeners de Início ---
function setupStartListeners() {
    document.addEventListener('keydown', handleGameStartInput, { once: true });
    document.addEventListener('mousedown', handleGameStartInput, { once: true });
    document.addEventListener('touchstart', handleGameStartInput, { once: true });
    // Para Gamepad, precisaríamos de uma lógica contínua que o detecte
    // Não usaremos um listener 'once' para gamepad aqui, pois não há um evento 'gamepadconnected' universal
    // O checkGamepads() é chamado no loop principal para detectar a ação do gamepad para o início
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
    immunityEndTime = 0;
    clearAllInputStates();
    setupStartListeners(); // Configura os listeners "one-shot" para iniciar
}

function atualizar() {
    const tempoAtual = performance.now();
    const deltaTime = tempoAtual - tempoUltimoFrame;
    tempoUltimoFrame = tempoAtual;

    checkGamepads(); // Verifica gamepads a cada frame, mesmo na tela inicial

    switch (estadoAtual) {
        case EstadosDoJogo.NaoIniciado:
            // A condição de início agora verifica também os gamepads aqui,
            // caso o handleGameStartInput não tenha sido disparado por eles.
            if (_gamepadAnyButtonPressed || _gamepadAnyAxisMoved) {
                 handleGameStartInput(); // Força o início se um gamepad for usado
            }
            // Não há mais 'if' com _anyKeyDown etc. aqui, pois handleGameStartInput cuida disso
            break;

        case EstadosDoJogo.EmProgresso:
            elementoTimer.innerHTML = `Você está fazendo ${textoNada} há\n${formatarTempo(tempoInatividade)}\n`;
            tempoInatividade += deltaTime;

            if (getDidSomething()) {
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

            // Para reiniciar, esperamos 1 segundo E um input qualquer (inclusive gamepad)
            if (tempoAtual - tempoUltimaMudancaEstado >= 1000 &&
               (_anyKeyDown || _mouseButtonDown0 || _gamepadAnyButtonPressed || _gamepadAnyAxisMoved || _touchCount > 0)) {
                reiniciarJogo();
            }
            break;
    }

    // Resetamos as flags de input base, que serão preenchidas pelos listeners para o próximo frame
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
        reiniciarJogo(); // Isso já chama setupStartListeners()
        requestAnimationFrame(gameLoop);
    } else {
        console.error("Elemento com ID 'timerText' não encontrado no HTML. O jogo não pode iniciar.");
    }
});
