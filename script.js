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
const initialImmunityPeriod = 3000; // Mantido em 3 segundos
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

// --- Variáveis de Estado do Input ---
let _anyKeyDown = false;
let _mouseButtonDown0 = false;
let _touchCount = 0;
let _acceleration = { x: 0, y: 0, z: 0 };

// NOVAS VARIÁVEIS PARA DETECÇÃO DE MOVIMENTO DO MOUSE POR POSIÇÃO ABSOLUTA
let _lastMouseX = -1; // Posição X do mouse no frame anterior
let _lastMouseY = -1; // Posição Y do mouse no frame anterior
let _mouseMovedSignificantly = false; // Flag para indicar movimento significativo

// --- CONFIGURAÇÕES DE SENSIBILIDADE E COMPATIBILIDADE MOBILE ---
let ACCELERATION_THRESHOLD = 0.8;

// Limiar para detectar movimento significativo do mouse pela posição absoluta (em pixels)
const MOUSE_POSITION_THRESHOLD = 2; // Mover 2 pixels já é considerado "algo"

const DISABLE_ACCELEROMETER_AND_MOUSE_AXIS_ON_MOBILE = true;

const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);


// Propriedade computada 'didSomething'
function getDidSomething() {
    // Se ainda estamos no período de imunidade, retorne false imediatamente.
    if (performance.now() < immunityEndTime) {
        return false;
    }

    // --- Lógica de detecção de "algo" ---

    // 1. Teclado, clique do mouse, toques (ações discretas)
    if (_anyKeyDown) {
        console.log("DEBUG: Perdeu por tecla pressionada.");
        return true;
    }
    if (_mouseButtonDown0) {
        console.log("DEBUG: Perdeu por clique do mouse.");
        return true;
    }
    // Detector de toque: Se há 1 ou mais toques ativos, o usuário está "fazendo algo".
    if (_touchCount > 0) {
        console.log("DEBUG: Perdeu por toque na tela (touchCount > 0).");
        return true;
    }

    // 2. Movimento do Mouse (APENAS PARA DESKTOP) e Acelerômetro (CONDICIONAL)
    if (!isMobileDevice || !DISABLE_ACCELEROMETER_AND_MOUSE_AXIS_ON_MOBILE) {
        // Movimento do mouse (para desktop): usa a nova flag _mouseMovedSignificantly
        if (_mouseMovedSignificantly) {
            console.log("DEBUG: Perdeu por mouse moved significantly.");
            return true;
        }

        // Acelerômetro (será considerado apenas se não for mobile OU se DISABLE_ACCELEROMETER_AND_MOUSE_AXIS_ON_MOBILE for false)
        if (Math.abs(_acceleration.x) > ACCELERATION_THRESHOLD ||
            Math.abs(_acceleration.y) > ACCELERATION_THRESHOLD ||
            Math.abs(_acceleration.z) > ACCELERATION_THRESHOLD) {
            console.log(`DEBUG: Perdeu por ACELERAÇÃO! X:${_acceleration.x.toFixed(2)}, Y:${_acceleration.y.toFixed(2)}, Z:${_acceleration.z.toFixed(2)}`);
            return true;
        }
    }

    // Se nada acima foi detectado, o jogador está fazendo "nada"
    return false;
}


// --- Funções Auxiliares para Manipular Input ---

function clearAllInputStates() {
    _anyKeyDown = false;
    _mouseButtonDown0 = false;
    _touchCount = 0;
    _acceleration = { x: 0, y: 0, z: 0 };
    _lastMouseX = -1; // Resetamos a posição do mouse para forçar uma nova detecção
    _lastMouseY = -1; // Resetamos a posição do mouse para forçar uma nova detecção
    _mouseMovedSignificantly = false; // Resetamos a flag de movimento
}

// --- Event Listeners Globais e Permanentes ---
document.addEventListener('keydown', (e) => { _anyKeyDown = true; });
document.addEventListener('mousedown', (e) => { if (e.button === 0) { _mouseButtonDown0 = true; } });

// MODIFICADO: Event Listener de mousemove para capturar a posição absoluta
document.addEventListener('mousemove', (e) => {
    // Apenas capturamos a posição. A detecção de movimento significativo ocorrerá no loop principal.
    // Isso é importante porque e.clientX/Y são sempre atualizados, enquanto e.movementX/Y podem ser 0 se o mouse parou por 1 frame.
    // console.log(`LIVE MOUSE: X:${e.clientX}, Y:${e.clientY}`); // DEBUG para ver posições absolutas
    if (_lastMouseX === -1) { // Primeira leitura ou após reset
        _lastMouseX = e.clientX;
        _lastMouseY = e.clientY;
    }
});

document.addEventListener('touchstart', (e) => {
    _touchCount = e.touches.length;
    // e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', (e) => { _touchCount = e.touches.length; });
document.addEventListener('touchcancel', (e) => { _touchCount = e.touches.length; });

if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (e) => {
        if (e.accelerationIncludingGravity) {
            _acceleration.x = e.accelerationIncludingGravity.x;
            _acceleration.y = e.accelerationIncludingGravity.y;
            _acceleration.z = e.accelerationIncludingGravity.z;
            // console.log(`LIVE ACCEL: X:${_acceleration.x.toFixed(2)}, Y:${_acceleration.y.toFixed(2)}, Z:${_acceleration.z.toFixed(2)}`);
        }
    });
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

    // NOVO: Verificar movimento do mouse no início do frame para maior responsividade
    // Isso garante que a detecção seja baseada na mudança de posição entre os quadros.
    if (!isMobileDevice && _lastMouseX !== -1) { // Só faz sentido no desktop e se já temos uma posição inicial
        // Obter a posição atual do mouse (pode ser necessário capturar mais frequentemente ou usar um evento diferente)
        // Para este modelo, assumimos que o último e.clientX/Y está em _lastMouseX/Y
        // mas vamos recalcular o movimento baseado na posição do ponteiro do navegador.
        // O ideal seria pegar e.clientX/Y dentro de mousemove e não no loop de update
        // Para o mouse, vamos confiar no último evento mousemove.
        // A lógica de _mouseMovedSignificantly é atualizada pelo evento mousemove.

        // Esta lógica abaixo agora está na função mousemove para maior precisão
        // deltaX = ... deltaY = ...
        // if (Math.abs(deltaX) > MOUSE_POSITION_THRESHOLD || Math.abs(deltaY) > MOUSE_POSITION_THRESHOLD) {
        //     _mouseMovedSignificantly = true;
        // }
    }


    switch (estadoAtual) {
        case EstadosDoJogo.NaoIniciado:
            // O jogo inicia se QUALQUER input for detectado (teclado, mouse, touch)
            if (_anyKeyDown || _mouseButtonDown0 || _touchCount > 0) {
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
               (_anyKeyDown || _mouseButtonDown0 || _touchCount > 0)) {
                reiniciarJogo();
                console.log("Jogo REINICIADO.");
            }
            break;
    }

    // Resetamos as flags de input de eventos DISCRETOS no final do frame.
    _anyKeyDown = false;
    _mouseButtonDown0 = false;
    _mouseMovedSignificantly = false; // IMPORTANTE: Zeramos a flag aqui para o próximo frame
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
