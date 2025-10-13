
declare interface ErrorBoundaryState {	};

declare interface ErrorBoundaryType extends React.Component<ErrorBoundaryProps, ErrorBoundaryState>  {
	constructor(props: any): ErrorBoundaryType;

	static getDerivedStateFromError(error: any): {	};

	componentDidCatch(error: any, errorInfo: any): void;

	render(): JSX.Element;
}
