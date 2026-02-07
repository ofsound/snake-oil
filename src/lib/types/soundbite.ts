import type {
	VariantType,
	MultipleChoiceOption,
	MultipleResponseOption,
	ImageChoiceOption,
	SequenceTrack,
	RankItem
} from '../variant-types';

/**
 * Base soundbite state interface used by all soundbite editors
 * Contains all possible fields for all variant types
 */
export interface SoundbiteState {
	id: number | string;
	variantType: VariantType;
	simpleGuessAnswers: string[];
	multipleChoiceOptions: MultipleChoiceOption[];
	multipleResponseOptions: MultipleResponseOption[];
	imageChoiceOptions: ImageChoiceOption[];
	imageChoiceFiles: (File | null)[];
	sequenceTracks: SequenceTrack[];
	sequenceCorrectTrackIndex: number;
	sequencePrompt: string;
	sequenceFiles: File[];
	rankItems: RankItem[];
	rankCorrectOrder: number[];
	rankPrompt: string;
	rankFiles: File[];
	question: string;
	questionTimeLimit?: number;
}

/**
 * Props interface for all variant editor components
 * All variant editors must accept these props
 */
export interface VariantEditorProps {
	soundbite: SoundbiteState;
	onChange: (updates: Partial<SoundbiteState>) => void;
	editorId?: string;
}
