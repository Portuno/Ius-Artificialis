const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-gold/5">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
