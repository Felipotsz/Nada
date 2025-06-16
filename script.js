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
const initialImmunityPeriod = 2500; // AUMENTADO PARA 2.5 SEGUNDOS
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

// --- NOVOS LIMIARES DE TOLERÂNCIA (MAIS ALTOS PARA TESTE) ---
const ACCELERATION_THRESHOLD = 0.5; // AUMENTADO SIGNIFICATIVAMENTE! (ex: 0.5 a 1.0 para teste)
const MOUSE_AXIS_THRESHOLD = 1.0;   // AUMENTADO PARA IGNORAR MOVIMENTOS PEQUENOS

// Propriedade computada 'didSomething'
function getDidSomething() {
    // Se ainda estamos no período de imunidade, retorne false imediatamente.
    if (performance.now() < immunityEndTime) {
        return false;
    }

    // --- Lógica de detecção de "algo" com limiares ---

    // ** DEBUG - Remova ou comente as linhas abaixo para isolar o acelerômetro **
    // if (_anyKeyDown || _mouseButtonDown0 || _touchCount > 0 || _gamepadAnyButtonPressed) {
    //     console.log("DEBUG: Perdeu por key/mouse/touch/gamepad button");
    //     return true;
    // }
    // if (Math.abs(_mouseAxisX) > MOUSE_AXIS_THRESHOLD ||
    //     Math.abs(_mouseAxisY) > MOUSE_AXIS_THRESHOLD) {
    //     console.log("DEBUG: Perdeu por mouse/touch axis. X:", _mouseAxisX.toFixed(2), "Y:", _mouseAxisY.toFixed(2));
    //     return true;
    // }
    // if (_gamepadAnyAxisMoved) {
    //     console.log("DEBUG: Perdeu por gamepad axis");
    //     return true;
    // }
    // ** FIM DEBUG **

    // Aceleração: verifica se o movimento é significativo (MAIS FOCO AQUI!)
    if (Math.abs(_acceleration.x) > ACCELERATION_THRESHOLD ||
        Math.abs(_acceleration.y) > ACCELERATION_THRESHOLD ||
        Math.abs(_acceleration.z) > ACCELERATION_THRESHOLD) {
        console.log(`DEBUG: Perdeu por ACELERAÇÃO! X:${_acceleration.x.toFixed(2)}, Y:${_acceleration.y.toFixed(2)}, Z:${_acceleration.z.toFixed(2)}`);
        return true;
    }

    // Se nada acima foi detectado, o jogador está fazendo "nada"
    return false;
}


// --- Funções Auxiliares para Manipular Input ---

function clearAllInputStates() {
    _anyKeyDown = false;
    _mouseButtonDown0 = false;
    _mouseAxisX = 0;
    _mouseAxisY = 0;
    _touchCount = 0;
    _acceleration = { x: 0, y: 0, z: 0 }; // Garante que a aceleração seja zerada na transição
    _gamepadAnyButtonPressed = false;
    _gamepadAnyAxisMoved = false;
}

// --- Event Listeners Globais e Permanentes ---
document.addEventListener('keydown', (e) => { _anyKeyDown = true; /* if (e.key === 'Escape') { console.log("Escape pressionado."); } */ });
document.addEventListener('mousedown', (e) => { if (e.button === 0) { _mouseButtonDown0 = true; } });
document.addEventListener('mousemove', (e) => { _mouseAxisX = e.movementX; _mouseAxisY = e.movementY; });

document.addEventListener('touchstart', (e) => {
    _touchCount = e.touches.length;
    // e.preventDefault(); // Descomente para impedir rolagem/zoom ao tocar
}, { passive: false });

document.addEventListener('touchend', (e) => { _touchCount = e.touches.length; });
document.addEventListener('touchcancel', (e) => { _touchCount = e.touches.length; });

if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (e) => {
        if (e.accelerationIncludingGravity) {
            _acceleration.x = e.accelerationIncludingGravity.x;
            _acceleration.y = e.accelerationIncludingGravity.y;
            _acceleration.z = e.accelerationIncludingGravity.z;
            // Descomente esta linha para VER O INPUT DO ACELERÔMETRO EM TEMPO REAL
            // console.log(`LIVE ACCEL: X:${_acceleration.x.toFixed(2)}, Y:${_acceleration.y.toFixed(2)}, Z:${_acceleration.z.toFixed(2)}`);
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
    immunityEndTime = 0;
    clearAllInputStates(); // Garante que todos os inputs estejam limpos ao voltar para o menu
}

function atualizar() {
    const tempoAtual = performance.now();
    const deltaTime = tempoAtual - tempoUltimoFrame;
    tempoUltimoFrame = tempoAtual;

    checkGamepads(); // Verifica gamepads a cada frame

    switch (estadoAtual) {
        case EstadosDoJogo.NaoIniciado:
            // O jogo inicia se QUALQUER input for detectado
            if (_anyKeyDown || _mouseButtonDown0 || _gamepadAnyButtonPressed || _gamepadAnyAxisMoved || _touchCount > 0) {
                estadoAtual = EstadosDoJogo.EmProgresso;
                tempoUltimaMudancaEstado = tempoAtual;
                immunityEndTime = tempoAtual + initialImmunityPeriod;
                clearAllInputStates(); // Limpa TODOS os inputs novamente, imediatamente após a transição
                console.log("Jogo INICIADO. Imunidade até:", immunityEndTime.toFixed(0));
            }
            break;

        case EstadosDoJogo.EmProgresso:
            elementoTimer.innerHTML = `Você está fazendo ${textoNada} há\n${formatarTempo(tempoInatividade)}\n`;
            tempoInatividade += deltaTime;

            if (getDidSomething()) { // getDidSomething() já verifica immunityEndTime
                atualizarScores();
                tempoUltimaMudancaEstado = tempoAtual;
                estadoAtual = EstadosDoJogo.FimDeJogo;
                console.log("Jogo PERDIDO. Tempo:", formatarTempo(tempoInatividade));
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
                console.log("Jogo REINICIADO.");
            }
            break;
    }

    // Resetamos as flags de input de eventos DISCRETOS no final do frame.
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
        carregarScores();
        reiniciarJogo(); // Inicia o jogo na tela de "NaoIniciado"
        requestAnimationFrame(gameLoop); // Inicia o loop do jogo
    } else {
        console.error("Elemento com ID 'timerText' não encontrado no HTML. O jogo não pode iniciar.");
    }
});
