import type { MoveResult } from "./types.ts";

function slideAndMerge(line: number[], size: number): { result: number[]; scoreGain: number } {
  const filtered = line.filter((v) => v !== 0);
  const result: number[] = [];
  let scoreGain = 0;

  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      scoreGain += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i += 1;
    }
  }

  while (result.length < size) {
    result.push(0);
  }

  return { result, scoreGain };
}

function transpose(board: number[][]): number[][] {
  return board[0].map((_, c) => board.map((row) => row[c]));
}

function reverseRows(board: number[][]): number[][] {
  return board.map((row) => [...row].reverse());
}

function processRows(board: number[][]): { result: number[][]; scoreGain: number; moved: boolean } {
  let totalScore = 0;
  let moved = false;
  const size = board.length;
  const result = board.map((row) => {
    const { result: newRow, scoreGain } = slideAndMerge(row, size);
    totalScore += scoreGain;
    if (newRow.some((v, i) => v !== row[i])) {
      moved = true;
    }
    return newRow;
  });
  return { result, scoreGain: totalScore, moved };
}

export function moveLeft(board: number[][]): MoveResult {
  const { result, scoreGain, moved } = processRows(board);
  return { board: result, scoreGain, moved };
}

export function moveRight(board: number[][]): MoveResult {
  const reversed = reverseRows(board);
  const { result, scoreGain, moved } = processRows(reversed);
  return { board: reverseRows(result), scoreGain, moved };
}

export function moveUp(board: number[][]): MoveResult {
  const transposed = transpose(board);
  const { result, scoreGain, moved } = processRows(transposed);
  return { board: transpose(result), scoreGain, moved };
}

export function moveDown(board: number[][]): MoveResult {
  const transposed = transpose(board);
  const reversed = reverseRows(transposed);
  const { result, scoreGain, moved } = processRows(reversed);
  const unReversed = reverseRows(result);
  return { board: transpose(unReversed), scoreGain, moved };
}
