import Swal from 'sweetalert2';

export type AlertIcon = 'success' | 'error' | 'warning' | 'info';

export function showToast(title: string, text: string, icon: AlertIcon = 'success') {
  return Swal.fire({
    title,
    text,
    icon,
    showConfirmButton: true,
    confirmButtonText: 'OKE',
    timer: icon === 'success' ? 3000 : undefined,
  });
}

export async function confirmDelete(namaPertama: string): Promise<boolean> {
  const result = await Swal.fire({
    title: 'Hapus Data?',
    text: 'Anda akan menghapus SPJ: ' + namaPertama,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal',
  });
  return result.isConfirmed;
}
