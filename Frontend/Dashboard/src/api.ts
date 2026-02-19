export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const postCampaign = async (payload: any) => {
    const response = await fetch(`${API_BASE_URL}/campaigns/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create campaign");
    }

    return response.json();
};
