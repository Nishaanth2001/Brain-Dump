import { useState, useCallback } from "react";

export default function useToast() {
  const [toast, setToast] = useState({
    msg:"",
    type:"",
    visible:false
  });

  const showToast = useCallback((msg, type="") => {
    setToast({
      msg,
      type,
      visible:true
    });

    setTimeout(() => {
      setToast(t => ({
        ...t,
        visible:false
      }));
    }, 2800);
  }, []);

  return {
    toast,
    showToast
  };
}