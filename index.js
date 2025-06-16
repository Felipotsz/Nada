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

// Tempo de graça após o início do jogo (em milissegundos)
const gracePeriodAfterStart = 500; // 0.5 segundos (você pode ajustar este valor)
let tempoInicioGracePeriod = 0; // Marca o tempo quando o grace period começou

// --- NOVAS VARIÁVEIS DE SCORE ---
let ultimoTempoJogada = 0; // Armazenará o tempo da última vez que o usuário jogou (em ms)
let recordeTempo = 0;      // Armazenará o recorde de tempo (em ms)
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

// --- Event Listeners para capturar input do usuário ---
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
});
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
                if (Math.abs(axisValue) > 0.1) {
                    _gamepadAnyAxisMoved = true;
                    break;
                }
            }
            if (_gamepadAnyAxisMoved) break;
        }
    }
}


// --- Funções de Lógica do Jogo ---

// Função para formatar o tempo (agora mais flexível para reutilização)
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

// --- NOVAS FUNÇÕES PARA O SCORE ---
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
    salvarScores(); // Salva no localStorage
}

// --- Fim das NOVAS FUNÇÕES ---


function reiniciarJogo() {
    estadoAtual = EstadosDoJogo.NaoIniciado;
    tempoInatividade = 0;
    // --- ATUALIZADO: Mostra scores no menu inicial ---
    elementoTimer.innerHTML =
        `Pressione qualquer tecla para começar a fazer ${textoNada}\n\n` +
        `Última jogada: ${formatarTempo(ultimoTempoJogada)}\n` +
        `Recorde: ${formatarTempo(recordeTempo)}`;
    tiempoUltimaMudancaEstado = performance.now();
    tempoUltimoFrame = performance.now();
    tempoInicioGracePeriod = 0;
    clearAllInputStates();
}

function atualizar() {
    const tempoAtual = performance.now();
    const deltaTime = tempoAtual - tempoUltimoFrame;
    tempoUltimoFrame = tempoAtual;

    checkGamepads();

    switch (estadoAtual) {
        case EstadosDoJogo.NaoIniciado:
            if (_anyKeyDown || _mouseButtonDown0 || _gamepadAnyButtonPressed || _gamepadAnyAxisMoved) {
                estadoAtual = EstadosDoJogo.EmProgresso;
                tempoUltimaMudancaEstado = tempoAtual;
                tempoInicioGracePeriod = tempoAtual;
                clearAllInputStates();
            }
            break;

        case EstadosDoJogo.EmProgresso:
            elementoTimer.innerHTML = `Você está fazendo ${textoNada} há\n${formatarTempo(tempoInatividade)}\n`;
            tempoInatividade += deltaTime;

            const tempoDesdeInicioGracePeriod = tempoAtual - tempoInicioGracePeriod;

            if (tempoDesdeInicioGracePeriod >= gracePeriodAfterStart &&
                tempoAtual - tempoUltimaMudancaEstado >= 1000 &&
                getDidSomething())
            {
                atualizarScores(); // --- NOVO: Atualiza scores antes de ir para FimDeJogo ---
                tempoUltimaMudancaEstado = tempoAtual;
                estadoAtual = EstadosDoJogo.FimDeJogo;
            }
            break;

        case EstadosDoJogo.FimDeJogo:
            // --- ATUALIZADO: Mostra scores na tela de Game Over ---
            elementoTimer.innerHTML =
                `Você fez ${textoAlgo}, você perdeu\n` +
                `Você fez ${textoNada} por ${formatarTempo(ultimoTempoJogada)}\n\n` + // Usa ultimoTempoJogada aqui
                `Recorde: ${formatarTempo(recordeTempo)}\n\n` +
                `Pressione qualquer tecla para reiniciar`;

            if (tempoAtual - tempoUltimaMudancaEstado >= 1000 && (_anyKeyDown || _mouseButtonDown0 || _gamepadAnyButtonPressed || _gamepadAnyAxisMoved)) {
                reiniciarJogo();
            }
            break;
    }

    _anyKeyDown = false;
    _mouseButtonDown0 = false;
    _mouseAxisX = 0;
    _mouseAxisY = 0;
}

// --- Loop Principal do Jogo ---
function gameLoop() {
    atualizar();
    requestAnimationFrame(gameLoop);
}

// --- Inicialização do Jogo ---
document.addEventListener('DOMContentLoaded', () => {
    if (elementoTimer) {
        carregarScores(); // --- NOVO: Carrega os scores ao iniciar a página ---
        reiniciarJogo();
        requestAnimationFrame(gameLoop);
    } else {
        console.error("Elemento com ID 'timerText' não encontrado no HTML. O jogo não pode iniciar.");
    }
});