import type { IrregularType } from "../../../../../generator/conjugator.js";
import type { Warning } from "../../../../../types/warning.js";
import type { ShortNegationPolicy, AuxLayerNode, BenefactiveAspectOp, ConjectureOp, ConnectiveOp, DesiderativeAspectOp, DesireOp, MiseruAspectOp, ProhibitionAspectOp, RequestAspectOp, SimpleAspectOp, ModalOp, NegationOp, ObligationIdiomOp, PoliteOp, PotentialKotoGaDekiruIdiomOp, TenseOp, VoiceOp } from "../grammar.js";
import type { OperatorOp, PassiveStemOptions, RenderContext } from "./base-model.js";

export interface AuxLayerOpState {
  preModalNeg: NegationOp | null;
  postModalNeg: NegationOp | null;
  preModalTense: TenseOp | null;
  postModalTense: TenseOp | null;
  readonly postModalNegations: NegationOp[];
  readonly postModalTenses: TenseOp[];
  preModalPolite: PoliteOp | null;
  postModalPolite: PoliteOp | null;
  obligation: ObligationIdiomOp | null;
  modal: ModalOp | null;
  conjecture: ConjectureOp | null;
  desire: DesireOp | null;
  desireIdx: number | null;
  voice: VoiceOp | null;
  voiceIdx: number | null;
  potentialKotoGaDekiru: PotentialKotoGaDekiruIdiomOp | null;
  connective: ConnectiveOp | null;
  aspect: SimpleAspectOp | null;
  benefactive: BenefactiveAspectOp | null;
  request: RequestAspectOp | null;
  prohibition: ProhibitionAspectOp | null;
  desiderative: DesiderativeAspectOp | null;
  miseru: MiseruAspectOp | null;
}

export interface AuxLayerRenderContext {
  readonly layer: AuxLayerNode;
  readonly ctx: RenderContext;
  readonly warnings: Warning[];
  readonly past: boolean;
  readonly formal: boolean;
  readonly isVerb: boolean;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemShortNegationPolicy: ShortNegationPolicy | undefined;
  readonly passiveStemOptions: PassiveStemOptions;
  readonly stemIsCommittedAdverb: boolean;
  readonly postPast: boolean;
  readonly terminalTeFormConnective: boolean;
  readonly requestTerminalBaseOps: OperatorOp[];
  readonly requestTerminalBasePath: boolean;
  readonly prohibitionTerminalBaseOps: OperatorOp[];
  readonly prohibitionTerminalBasePath: boolean;
}
