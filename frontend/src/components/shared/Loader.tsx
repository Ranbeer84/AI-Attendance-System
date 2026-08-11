interface LoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export default function Loader({ label = "Loading...", fullScreen = false }: LoaderProps) {
  return (
    <div className={fullScreen ? "loading-screen" : "loader-inline"}>
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}