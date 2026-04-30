import { useEffect } from "react";
import Swal from "sweetalert2";

export const useToastOnLoad = () => {
    useEffect(() => {
        const toastMessage = localStorage.getItem("toastLogout");
        if (toastMessage) {
            Swal.fire({
                toast: true,
                icon: "info",
                title: toastMessage,
                position: "top-end",
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
            });
            localStorage.removeItem("toastLogout");
        }
    }, []);
};
