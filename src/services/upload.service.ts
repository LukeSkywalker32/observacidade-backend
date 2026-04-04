import cloudinary from "../config/cloudinary";
import streamifier from "streamifier";

export function uploadToCloudinary(
    fileBuffer: Buffer,
    mimetype: string,
    originalName: string,
    folder: string
): Promise<string> {
    return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "auto",
                type: "upload",
                public_id: originalName.split(".")[0],

            },
            (error, result) => {
                if (error) return reject(error);
                if (result) return resolve(result.secure_url);
            }
        );

        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
}