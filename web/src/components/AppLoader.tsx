import { BrandMark } from "./BrandMark";

export function AppLoader({ message }: { message?: string }) {
  return (
    <div className="app-loader">
      <BrandMark compact className="app-loader-brand" />
      {message && <p>{message}</p>}
    </div>
  );
}
