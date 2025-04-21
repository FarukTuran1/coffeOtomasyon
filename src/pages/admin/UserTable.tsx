import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

function fetchProfiles() {
  return supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
}

async function updateUserRole({ id, role }: { id: string; role: string | null }) {
    const { error } = await supabase
        .from('profiles')
        .update({ role: role === 'admin' ? 'admin' : 'user' })
        .eq('id', id);
    if (error) {
        console.error('Rol güncellenirken hata:', error);
        throw new Error(`Rol güncellenemedi: ${error.message}`);
    }
}

export default function UserTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profiles, isLoading, isError } = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await fetchProfiles();
      if (error) throw error;
      return data || [];
    },
  });

  const updateRoleMutation = useMutation({
      mutationFn: updateUserRole,
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["profiles"] });
          toast({ title: "Başarılı", description: "Kullanıcı rolü güncellendi." });
      },
      onError: (error) => {
          console.error("Rol güncelleme başarısız:", error);
          toast({ title: "Hata", description: `Rol güncellenemedi: ${error.message}`, variant: "destructive" });
      }
  });

  const handleRoleChange = (profileId: string, newRole: string) => {
      if (!newRole) return;
      updateRoleMutation.mutate({ id: profileId, role: newRole });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold">Kullanıcılar (Profiller)</div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-posta / İsim</TableHead>
              <TableHead className="hidden lg:table-cell">Kullanıcı ID</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="hidden md:table-cell">Kayıt Tarihi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={2} className="md:col-span-3 lg:col-span-4">Yükleniyor...</TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={2} className="md:col-span-3 lg:col-span-4">Kullanıcılar yüklenemedi.</TableCell>
              </TableRow>
            )}
            {profiles && profiles.length === 0 && (
                <TableRow>
                    <TableCell colSpan={2} className="md:col-span-3 lg:col-span-4">Gösterilecek kullanıcı profili bulunmuyor.</TableCell>
                </TableRow>
            )}
            {profiles &&
              profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>{profile.name ?? 'İsim Yok'}</TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs">{profile.id}</TableCell>
                  <TableCell>
                     <Select 
                         defaultValue={profile.role ?? 'user'} 
                         onValueChange={(newRole) => handleRoleChange(profile.id, newRole)}
                         disabled={updateRoleMutation.isPending && updateRoleMutation.variables?.id === profile.id}
                     >
                         <SelectTrigger className="w-full sm:w-[120px]">
                             <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                             <SelectItem value="user">User</SelectItem>
                             <SelectItem value="admin">Admin</SelectItem>
                         </SelectContent>
                     </Select>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{new Date(profile.created_at).toLocaleDateString("tr-TR")}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

