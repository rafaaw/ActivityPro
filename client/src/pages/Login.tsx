import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { LogIn, Timer, Eye, EyeOff } from "lucide-react";

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberUser, setRememberUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Carregar usuário salvo no localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem('activitypro_username');
    if (savedUsername) {
      form.setValue('username', savedUsername);
      setRememberUser(true);
    }
  }, [form]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: (data: any) => {
      // Salvar/remover usuário do localStorage
      if (rememberUser) {
        localStorage.setItem('activitypro_username', form.getValues('username'));
      } else {
        localStorage.removeItem('activitypro_username');
      }

      // Construir nome de exibição de forma mais robusta
      let displayName = data.user?.username || 'Usuário';

      if (data.user?.firstName) {
        displayName = data.user.firstName;
        if (data.user?.lastName) {
          displayName += ` ${data.user.lastName}`;
        }
      }

      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo, ${displayName}!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Redirect will happen automatically through the auth hook
    },
    onError: (error: any) => {
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginData) => {
    setIsLoading(true);
    loginMutation.mutate(data, {
      onSettled: () => setIsLoading(false),
    });
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95 dark:border-gray-700">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 gradient-bg rounded-full flex items-center justify-center">
              <Timer className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-display font-bold dark:text-white">
                Entrar
              </CardTitle>
              <CardDescription className="text-base mt-2 dark:text-gray-300">
                Sistema de Controle de Atividades e Tempo
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Digite seu usuário"
                          autoComplete="username"
                          {...field}
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Digite sua senha"
                            autoComplete="current-password"
                            {...field}
                            data-testid="input-password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-user"
                    checked={rememberUser}
                    onCheckedChange={(checked) => setRememberUser(checked === true)}
                    data-testid="checkbox-remember-user"
                  />
                  <label
                    htmlFor="remember-user"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-white"
                  >
                    Lembrar usuário
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-bg hover:opacity-90 h-11"
                  disabled={isLoading || loginMutation.isPending}
                  data-testid="button-login"
                >
                  {isLoading || loginMutation.isPending ? (
                    "Entrando..."
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}