/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/analysis/lattice.rs
 *
 * Copyright (c) 2021-2024 Works Applications Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file has been modified: ported from Rust to TypeScript and adapted
 * for HaruMT.
 */
import { ConnectionMatrix } from "./connect.js";
import { WordId } from "./word-id.js";
import { SudachiError } from "./error.js";
import { Node, NodeIdx } from "./node.js";

interface VNode {
  readonly totalCost: number;
  readonly rightId: number;
}

const BOUNDARY_CONNECTION_ID = 0;

export class Lattice {
  private ends: VNode[][] = [];
  private endsFull: Node[][] = [];
  private indices: NodeIdx[][] = [];
  private begins: NodeIdx[][] = [];
  private eos: readonly [NodeIdx, number] | undefined;
  private size = 0;

  reset(length: number): void {
    this.ends = Array.from({ length: length + 1 }, () => []);
    this.endsFull = Array.from({ length: length + 1 }, () => []);
    this.indices = Array.from({ length: length + 1 }, () => []);
    this.begins = Array.from({ length: length + 1 }, () => []);
    this.eos = undefined;
    this.size = length + 1;
    this.ends[0]?.push({ rightId: 0, totalCost: 0 });
  }

  connectEos(conn: ConnectionMatrix): void {
    const eosOffset = this.size - 1;
    const node = new Node(eosOffset, eosOffset, 0, 0, 0, WordId.EOS);
    const [idx, cost] = this.connectNode(node, conn);
    if (cost === Number.MAX_SAFE_INTEGER) {
      throw new SudachiError({
        code: "EosBosDisconnect",
        message:
          "End of sentence (EOS) is not connected to beginning of sentence (BOS)"
      });
    }
    this.eos = [idx, cost];
  }

  insert(
    node: Node,
    conn: ConnectionMatrix,
    forbidPredecessor?: (left: Node) => boolean
  ): number {
    const [idx, cost] = this.connectNode(node, conn, forbidPredecessor);
    const slot = this.ends[node.end];
    if (slot !== undefined) {
      this.begins[node.begin]?.push(new NodeIdx(node.end, slot.length));
    }
    slot?.push({ rightId: node.rightId, totalCost: cost });
    this.indices[node.end]?.push(idx);
    this.endsFull[node.end]?.push(node);
    return cost;
  }

  reopenBarrierSeam(begin: number, conn: ConnectionMatrix): boolean {
    const entries = this.begins[begin] ?? [];
    if (entries.length === 0) {
      return false;
    }
    for (const idx of entries) {
      if (this.ends[idx.end]?.[idx.index]?.totalCost !== Number.MAX_SAFE_INTEGER) {
        return false;
      }
    }
    let bestCost = Number.MAX_SAFE_INTEGER;
    let bestIndex = -1;
    for (const [index, leftNode] of (this.ends[begin] ?? []).entries()) {
      if (leftNode.totalCost === Number.MAX_SAFE_INTEGER) {
        continue;
      }
      const cost = leftNode.totalCost + conn.cost(leftNode.rightId, BOUNDARY_CONNECTION_ID);
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) {
      return false;
    }
    for (const idx of entries) {
      const node = this.endsFull[idx.end]?.[idx.index];
      const slot = this.ends[idx.end];
      if (node === undefined || slot === undefined) {
        continue;
      }
      slot[idx.index] = {
        rightId: node.rightId,
        totalCost: bestCost + conn.cost(BOUNDARY_CONNECTION_ID, node.leftId) + node.cost
      };
      const indices = this.indices[idx.end];
      if (indices !== undefined) {
        indices[idx.index] = new NodeIdx(begin, bestIndex);
      }
    }
    return true;
  }

  connectNode(
    node: Node,
    conn: ConnectionMatrix,
    forbidPredecessor?: (left: Node) => boolean
  ): readonly [NodeIdx, number] {
    let minCost = Number.MAX_SAFE_INTEGER;
    let prevIdx = NodeIdx.EMPTY;
    const leftNodes = this.endsFull[node.begin] ?? [];
    for (const [index, leftNode] of (this.ends[node.begin] ?? []).entries()) {
      if (leftNode.totalCost === Number.MAX_SAFE_INTEGER) {
        continue;
      }
      const leftFull = leftNodes[index];
      if (forbidPredecessor !== undefined && leftFull !== undefined && forbidPredecessor(leftFull)) {
        continue;
      }
      const cost =
        leftNode.totalCost +
        conn.cost(leftNode.rightId, node.leftId) +
        node.cost;
      if (cost < minCost) {
        minCost = cost;
        prevIdx = new NodeIdx(node.begin, index);
      }
    }
    return [prevIdx, minCost];
  }

  hasPreviousNode(index: number): boolean {
    return (this.ends[index]?.length ?? 0) > 0;
  }

  node(id: NodeIdx): readonly [Node, number] {
    const node = this.endsFull[id.end]?.[id.index];
    const vNode = this.ends[id.end]?.[id.index];
    if (node === undefined || vNode === undefined) {
      throw new SudachiError({
        code: "EosBosDisconnect",
        message:
          "End of sentence (EOS) is not connected to beginning of sentence (BOS)"
      });
    }
    return [node, vNode.totalCost];
  }

  fillTopPath(): NodeIdx[] {
    if (this.eos === undefined) {
      return [];
    }
    const result: NodeIdx[] = [];
    let idx = this.eos[0];
    result.push(idx);
    while (idx.end !== 0) {
      const prevIdx = this.indices[idx.end]?.[idx.index];
      if (prevIdx === undefined || prevIdx.end === 0) {
        break;
      }
      result.push(prevIdx);
      idx = prevIdx;
    }
    return result;
  }
}
