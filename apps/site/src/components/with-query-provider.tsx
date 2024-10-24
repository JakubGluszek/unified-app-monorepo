import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const withQueryProvider = (Component: React.FC) => {
  return function WrapperComponent(props: any) {
    return (
      <QueryClientProvider client={queryClient}>
        <Component {...props} />
      </QueryClientProvider>
    );
  };
};

export default withQueryProvider;
