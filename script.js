const boardElement = document.getElementById("board");
const turnElement = document.getElementById("turn");
const statusElement = document.getElementById("status");
const restartButton = document.getElementById("restart");

const PIECES = {
    white: {
        king: "♔",
        queen: "♕",
        rook: "♖",
        bishop: "♗",
        knight: "♘",
        pawn: "♙"
    },
    black: {
        king: "♚",
        queen: "♛",
        rook: "♜",
        bishop: "♝",
        knight: "♞",
        pawn: "♟"
    }
};

let board;
let currentPlayer;
let selectedSquare;
let legalMoves;
let gameOver;
let lastMove;
let enPassantTarget;

let castlingRights = {
    whiteKing: true,
    whiteQueen: true,
    blackKing: true,
    blackQueen: true
};

function createInitialBoard() {
    return [
        [
            { type: "rook", color: "black" },
            { type: "knight", color: "black" },
            { type: "bishop", color: "black" },
            { type: "queen", color: "black" },
            { type: "king", color: "black" },
            { type: "bishop", color: "black" },
            { type: "knight", color: "black" },
            { type: "rook", color: "black" }
        ],
        Array(8).fill(null).map(() => ({
            type: "pawn",
            color: "black"
        })),
        Array(8).fill(null),
        Array(8).fill(null),
        Array(8).fill(null),
        Array(8).fill(null),
        Array(8).fill(null).map(() => ({
            type: "pawn",
            color: "white"
        })),
        [
            { type: "rook", color: "white" },
            { type: "knight", color: "white" },
            { type: "bishop", color: "white" },
            { type: "queen", color: "white" },
            { type: "king", color: "white" },
            { type: "bishop", color: "white" },
            { type: "knight", color: "white" },
            { type: "rook", color: "white" }
        ]
    ];
}

function startGame() {
    board = createInitialBoard();
    currentPlayer = "white";
    selectedSquare = null;
    legalMoves = [];
    gameOver = false;
    lastMove = null;
    enPassantTarget = null;

    castlingRights = {
        whiteKing: true,
        whiteQueen: true,
        blackKing: true,
        blackQueen: true
    };

    statusElement.textContent = "Selecciona una pieza para comenzar";
    renderBoard();
}

function renderBoard() {
    boardElement.innerHTML = "";

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement("div");

            square.classList.add(
                "square",
                (row + col) % 2 === 0 ? "light" : "dark"
            );

            if (
                selectedSquare &&
                selectedSquare.row === row &&
                selectedSquare.col === col
            ) {
                square.classList.add("selected");
            }

            if (
                lastMove &&
                (
                    (lastMove.from.row === row && lastMove.from.col === col) ||
                    (lastMove.to.row === row && lastMove.to.col === col)
                )
            ) {
                square.classList.add("last-move");
            }

            if (
                legalMoves.some(
                    move => move.row === row && move.col === col
                )
            ) {
                square.classList.add("legal");

                if (board[row][col]) {
                    square.classList.add("capture");
                }
            }

            const piece = board[row][col];

            if (piece) {
                const pieceElement = document.createElement("span");
                pieceElement.className = "piece";
                pieceElement.textContent = PIECES[piece.color][piece.type];
                square.appendChild(pieceElement);
            }

            if (col === 0) {
                const rank = document.createElement("span");
                rank.className = "coordinates rank";
                rank.textContent = 8 - row;
                square.appendChild(rank);
            }

            if (row === 7) {
                const file = document.createElement("span");
                file.className = "coordinates file";
                file.textContent = String.fromCharCode(97 + col);
                square.appendChild(file);
            }

            square.addEventListener("click", () => handleSquareClick(row, col));

            boardElement.appendChild(square);
        }
    }

    updateTurn();
}

function updateTurn() {
    const playerName =
        currentPlayer === "white" ? "Blancas" : "Negras";

    turnElement.textContent = `Turno: ${playerName}`;

    const kingInCheck = isKingInCheck(currentPlayer);

    if (kingInCheck) {
        document.querySelectorAll(".square").forEach((square, index) => {
            const row = Math.floor(index / 8);
            const col = index % 8;
            const piece = board[row][col];

            if (
                piece &&
                piece.type === "king" &&
                piece.color === currentPlayer
            ) {
                square.classList.add("check");
            }
        });
    }
}

function handleSquareClick(row, col) {
    if (gameOver) return;

    const piece = board[row][col];

    if (selectedSquare) {
        const isLegal = legalMoves.some(
            move => move.row === row && move.col === col
        );

        if (isLegal) {
            movePiece(
                selectedSquare.row,
                selectedSquare.col,
                row,
                col
            );
            return;
        }

        if (piece && piece.color === currentPlayer) {
            selectPiece(row, col);
            return;
        }

        selectedSquare = null;
        legalMoves = [];
        renderBoard();
        return;
    }

    if (piece && piece.color === currentPlayer) {
        selectPiece(row, col);
    }
}

function selectPiece(row, col) {
    selectedSquare = { row, col };

    legalMoves = getLegalMoves(row, col);

    renderBoard();
}

function getLegalMoves(row, col, position = board) {
    const piece = position[row][col];

    if (!piece) return [];

    let moves = [];

    switch (piece.type) {
        case "pawn":
            moves = getPawnMoves(row, col, position);
            break;

        case "rook":
            moves = getSlidingMoves(
                row,
                col,
                position,
                [[1, 0], [-1, 0], [0, 1], [0, -1]]
            );
            break;

        case "bishop":
            moves = getSlidingMoves(
                row,
                col,
                position,
                [[1, 1], [1, -1], [-1, 1], [-1, -1]]
            );
            break;

        case "queen":
            moves = getSlidingMoves(
                row,
                col,
                position,
                [
                    [1, 0],
                    [-1, 0],
                    [0, 1],
                    [0, -1],
                    [1, 1],
                    [1, -1],
                    [-1, 1],
                    [-1, -1]
                ]
            );
            break;

        case "knight":
            moves = getKnightMoves(row, col, position);
            break;

        case "king":
            moves = getKingMoves(row, col, position);
            break;
    }

    // Elimina movimientos que dejan al propio rey en jaque.
    return moves.filter(move => {
        const testBoard = cloneBoard(position);

        makeMoveOnBoard(
            testBoard,
            { row, col },
            move,
            false
        );

        return !isKingInCheckOnBoard(piece.color, testBoard);
    });
}

function getPawnMoves(row, col, position) {
    const piece = position[row][col];
    const moves = [];

    const direction = piece.color === "white" ? -1 : 1;
    const startRow = piece.color === "white" ? 6 : 1;

    const nextRow = row + direction;

    if (
        inBounds(nextRow, col) &&
        !position[nextRow][col]
    ) {
        moves.push({ row: nextRow, col });

        const doubleRow = row + direction * 2;

        if (
            row === startRow &&
            !position[doubleRow][col]
        ) {
            moves.push({
                row: doubleRow,
                col
            });
        }
    }

    for (const dc of [-1, 1]) {
        const newRow = row + direction;
        const newCol = col + dc;

        if (!inBounds(newRow, newCol)) continue;

        const target = position[newRow][newCol];

        if (
            target &&
            target.color !== piece.color &&
            target.type !== "king"
        ) {
            moves.push({
                row: newRow,
                col: newCol
            });
        }
    }

    // Captura al paso.
    if (enPassantTarget) {
        if (
            enPassantTarget.row === row + direction &&
            Math.abs(enPassantTarget.col - col) === 1
        ) {
            moves.push({
                row: enPassantTarget.row,
                col: enPassantTarget.col,
                enPassant: true
            });
        }
    }

    return moves;
}

function getSlidingMoves(row, col, position, directions) {
    const piece = position[row][col];
    const moves = [];

    for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;

        while (inBounds(r, c)) {
            const target = position[r][c];

            if (!target) {
                moves.push({ row: r, col: c });
            } else {
                if (
                    target.color !== piece.color &&
                    target.type !== "king"
                ) {
                    moves.push({ row: r, col: c });
                }

                break;
            }

            r += dr;
            c += dc;
        }
    }

    return moves;
}

function getKnightMoves(row, col, position) {
    const piece = position[row][col];
    const moves = [];

    const offsets = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1]
    ];

    for (const [dr, dc] of offsets) {
        const r = row + dr;
        const c = col + dc;

        if (!inBounds(r, c)) continue;

        const target = position[r][c];

        if (
            !target ||
            (
                target.color !== piece.color &&
                target.type !== "king"
            )
        ) {
            moves.push({ row: r, col: c });
        }
    }

    return moves;
}

function getKingMoves(row, col, position) {
    const piece = position[row][col];
    const moves = [];

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;

            const r = row + dr;
            const c = col + dc;

            if (!inBounds(r, c)) continue;

            const target = position[r][c];

            if (
                !target ||
                (
                    target.color !== piece.color &&
                    target.type !== "king"
                )
            ) {
                moves.push({ row: r, col: c });
            }
        }
    }

    // Enroque.
    if (!isKingInCheckOnBoard(piece.color, position)) {
        const enemy = opposite(piece.color);

        // Enroque corto.
        const kingSide =
            piece.color === "white"
                ? castlingRights.whiteKing
                : castlingRights.blackKing;

        if (
            kingSide &&
            position[row][5] === null &&
            position[row][6] === null &&
            position[row][7] &&
            position[row][7].type === "rook" &&
            position[row][7].color === piece.color &&
            !isSquareAttacked(row, 5, enemy, position) &&
            !isSquareAttacked(row, 6, enemy, position)
        ) {
            moves.push({
                row,
                col: 6,
                castle: "king"
            });
        }

        // Enroque largo.
        const queenSide =
            piece.color === "white"
                ? castlingRights.whiteQueen
                : castlingRights.blackQueen;

        if (
            queenSide &&
            position[row][1] === null &&
            position[row][2] === null &&
            position[row][3] === null &&
            position[row][0] &&
            position[row][0].type === "rook" &&
            position[row][0].color === piece.color &&
            !isSquareAttacked(row, 3, enemy, position) &&
            !isSquareAttacked(row, 2, enemy, position)
        ) {
            moves.push({
                row,
                col: 2,
                castle: "queen"
            });
        }
    }

    return moves;
}

function movePiece(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];

    const move = legalMoves.find(
        m => m.row === toRow && m.col === toCol
    );

    if (!move) return;

    // Captura al paso.
    if (move.enPassant) {
        board[fromRow][toCol] = null;
    }

    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;

    // Enroque.
    if (move.castle === "king") {
        board[toRow][5] = board[toRow][7];
        board[toRow][7] = null;
    }

    if (move.castle === "queen") {
        board[toRow][3] = board[toRow][0];
        board[toRow][0] = null;
    }

    updateCastlingRights(piece, fromRow, fromCol);

    // Si se captura una torre, también se pierde el derecho correspondiente.
    updateCastlingRightsForCapture(toRow, toCol);

    // Peón de dos casillas: habilita captura al paso.
    if (
        piece.type === "pawn" &&
        Math.abs(toRow - fromRow) === 2
    ) {
        enPassantTarget = {
            row: (fromRow + toRow) / 2,
            col: fromCol
        };
    } else {
        enPassantTarget = null;
    }

    // Promoción.
    if (
        piece.type === "pawn" &&
        (toRow === 0 || toRow === 7)
    ) {
        promotePawn(toRow, toCol, piece.color);
    }

    lastMove = {
        from: {
            row: fromRow,
            col: fromCol
        },
        to: {
            row: toRow,
            col: toCol
        }
    };

    selectedSquare = null;
    legalMoves = [];

    currentPlayer = opposite(currentPlayer);

    checkGameState();
    renderBoard();
}

function promotePawn(row, col, color) {
    const choice = prompt(
        "Promoción del peón:\n" +
        "1 = Dama\n" +
        "2 = Torre\n" +
        "3 = Alfil\n" +
        "4 = Caballo",
        "1"
    );

    const options = {
        "1": "queen",
        "2": "rook",
        "3": "bishop",
        "4": "knight"
    };

    board[row][col].type = options[choice] || "queen";
}

function updateCastlingRights(piece, row, col) {
    if (piece.type === "king") {
        if (piece.color === "white") {
            castlingRights.whiteKing = false;
            castlingRights.whiteQueen = false;
        } else {
            castlingRights.blackKing = false;
            castlingRights.blackQueen = false;
        }
    }

    if (piece.type === "rook") {
        if (piece.color === "white") {
            if (row === 7 && col === 0)
                castlingRights.whiteQueen = false;

            if (row === 7 && col === 7)
                castlingRights.whiteKing = false;
        } else {
            if (row === 0 && col === 0)
                castlingRights.blackQueen = false;

            if (row === 0 && col === 7)
                castlingRights.blackKing = false;
        }
    }
}

function updateCastlingRightsForCapture(row, col) {
    const captured = board[row][col];

    if (!captured || captured.type !== "rook") return;

    if (captured.color === "white") {
        if (row === 7 && col === 0)
            castlingRights.whiteQueen = false;

        if (row === 7 && col === 7)
            castlingRights.whiteKing = false;
    } else {
        if (row === 0 && col === 0)
            castlingRights.blackQueen = false;

        if (row === 0 && col === 7)
            castlingRights.blackKing = false;
    }
}

function checkGameState() {
    const inCheck = isKingInCheck(currentPlayer);
    const hasMoves = hasLegalMoves(currentPlayer);

    if (!hasMoves && inCheck) {
        gameOver = true;

        const winner =
            currentPlayer === "white"
                ? "Negras"
                : "Blancas";

        statusElement.textContent =
            `♚ JAQUE MATE — ¡Ganan ${winner}!`;

        return;
    }

    if (!hasMoves && !inCheck) {
        gameOver = true;
        statusElement.textContent = "TABLAS — Rey ahogado";
        return;
    }

    if (inCheck) {
        statusElement.textContent = "⚠️ ¡Jaque!";
    } else {
        statusElement.textContent = "Partida en curso";
    }
}

function hasLegalMoves(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];

            if (
                piece &&
                piece.color === color &&
                getLegalMoves(row, col).length > 0
            ) {
                return true;
            }
        }
    }

    return false;
}

function isKingInCheck(color) {
    return isKingInCheckOnBoard(color, board);
}

function isKingInCheckOnBoard(color, position) {
    let king = null;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = position[row][col];

            if (
                piece &&
                piece.type === "king" &&
                piece.color === color
            ) {
                king = { row, col };
                break;
            }
        }

        if (king) break;
    }

    if (!king) return true;

    return isSquareAttacked(
        king.row,
        king.col,
        opposite(color),
        position
    );
}

function isSquareAttacked(row, col, byColor, position) {
    // Peones.
    const pawnDirection = byColor === "white" ? -1 : 1;
    const pawnRow = row - pawnDirection;

    for (const dc of [-1, 1]) {
        const pawnCol = col - dc;

        if (!inBounds(pawnRow, pawnCol)) continue;

        const piece = position[pawnRow][pawnCol];

        if (
            piece &&
            piece.color === byColor &&
            piece.type === "pawn"
        ) {
            return true;
        }
    }

    // Caballos.
    const knightOffsets = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1]
    ];

    for (const [dr, dc] of knightOffsets) {
        const r = row + dr;
        const c = col + dc;

        if (!inBounds(r, c)) continue;

        const piece = position[r][c];

        if (
            piece &&
            piece.color === byColor &&
            piece.type === "knight"
        ) {
            return true;
        }
    }

    // Reyes.
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;

            const r = row + dr;
            const c = col + dc;

            if (!inBounds(r, c)) continue;

            const piece = position[r][c];

            if (
                piece &&
                piece.color === byColor &&
                piece.type === "king"
            ) {
                return true;
            }
        }
    }

    // Torres y damas.
    const rookDirections = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];

    for (const [dr, dc] of rookDirections) {
        let r = row + dr;
        let c = col + dc;

        while (inBounds(r, c)) {
            const piece = position[r][c];

            if (piece) {
                if (
                    piece.color === byColor &&
                    (
                        piece.type === "rook" ||
                        piece.type === "queen"
                    )
                ) {
                    return true;
                }

                break;
            }

            r += dr;
            c += dc;
        }
    }

    // Alfiles y damas.
    const bishopDirections = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1]
    ];

    for (const [dr, dc] of bishopDirections) {
        let r = row + dr;
        let c = col + dc;

        while (inBounds(r, c)) {
            const piece = position[r][c];

            if (piece) {
                if (
                    piece.color === byColor &&
                    (
                        piece.type === "bishop" ||
                        piece.type === "queen"
                    )
                ) {
                    return true;
                }

                break;
            }

            r += dr;
            c += dc;
        }
    }

    return false;
}

function makeMoveOnBoard(position, from, to, updateSpecial = true) {
    const piece = position[from.row][from.col];

    if (!piece) return;

    if (to.enPassant) {
        position[from.row][to.col] = null;
    }

    position[to.row][to.col] = piece;
    position[from.row][from.col] = null;

    if (to.castle === "king") {
        position[to.row][5] = position[to.row][7];
        position[to.row][7] = null;
    }

    if (to.castle === "queen") {
        position[to.row][3] = position[to.row][0];
        position[to.row][0] = null;
    }
}

function cloneBoard(original) {
    return original.map(row =>
        row.map(piece =>
            piece ? { ...piece } : null
        )
    );
}

function opposite(color) {
    return color === "white" ? "black" : "white";
}

function inBounds(row, col) {
    return (
        row >= 0 &&
        row < 8 &&
        col >= 0 &&
        col < 8
    );
}

restartButton.addEventListener("click", startGame);

startGame();
