import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../Config';

export const pickFile = async () => {
  try {
    console.log('Starting file picker...');
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    console.log('File picker result:', JSON.stringify(result, null, 2));

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const file = result.assets[0];
      console.log('File selected:', file.name, file.uri);
      return { uri: file.uri, name: file.name, mimeType: file.mimeType };
    }
    console.log('File picker canceled or invalid:', result);
    return null;
  } catch (error) {
    console.error('Error picking file:', error);
    return null;
  }
};

export const uploadToSupabase = async (uri, bucket) => {
  try {
    console.log(`Uploading to bucket: ${bucket}, URI: ${uri}`);
    
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log(`File read as base64, length: ${base64.length}`);

    const arrayBuffer = new Uint8Array(
      atob(base64)
        .split('')
        .map((char) => char.charCodeAt(0))
    ).buffer;
    console.log(`Converted to ArrayBuffer, size: ${arrayBuffer.byteLength}`);

    const fileExtension = uri.split('.').pop() || 'bin';
    const fileName = `${Date.now()}.${fileExtension}`;
    console.log(`Generated file name: ${fileName}`);

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, arrayBuffer, {
        contentType: getContentType(fileExtension),
      });

    if (error) {
      console.error('Supabase upload error:', error.message);
      return null;
    }

    const publicUrl = supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
    console.log(`Uploaded URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error.message);
    return null;
  }
};

const getContentType = (extension) => {
  const types = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };
  return types[extension.toLowerCase()] || 'application/octet-stream';
};

export const pickImage = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('Sorry, we need camera roll permissions to make this work!');
    return null;
  }

  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['image'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }
  return null;
};