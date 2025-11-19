import { ref, watch } from 'vue';

const STORAGE_KEY = 'fzbus_theme';
const prefersDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const getInitialTheme = () => {
	if (typeof window === 'undefined') {
		return 'light';
	}
	return localStorage.getItem(STORAGE_KEY) || (prefersDark() ? 'dark' : 'light');
};

const theme = ref(getInitialTheme());

const applyTheme = (value) => {
	if (typeof document !== 'undefined') {
		const root = document.documentElement;
		if (value === 'dark') {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}
	}
};

watch(
	theme,
	(value) => {
		localStorage.setItem(STORAGE_KEY, value);
		applyTheme(value);
	},
	{ immediate: true },
);

const toggleTheme = () => {
	theme.value = theme.value === 'light' ? 'dark' : 'light';
};

const setTheme = (value) => {
	theme.value = value;
};

export const useTheme = () => ({
	theme,
	toggleTheme,
	setTheme,
});
