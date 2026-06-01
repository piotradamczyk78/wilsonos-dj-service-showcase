import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { useState } from 'react';
import { AI_MODELS, type AIModel } from '@/services/aiModels';
import { Colors } from '@/constants/Colors';

interface ModelSelectorProps {
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled }: ModelSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const currentModel = AI_MODELS[selectedModel];

  const modelOptions = Object.values(AI_MODELS);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.disabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.emoji}>{currentModel.emoji}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.modelName}>{currentModel.displayName}</Text>
          <Text style={styles.modelCost}>
            ${currentModel.inputPrice}/${currentModel.outputPrice} per 1M tokens
          </Text>
        </View>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Wybierz model AI</Text>
            <Text style={styles.modalSubtitle}>
              Tańsze modele zużywają mniej kredytów 💰
            </Text>

            <ScrollView style={styles.optionsList}>
              {modelOptions.map((model) => {
                const isSelected = model.id === selectedModel;
                return (
                  <TouchableOpacity
                    key={model.id}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => {
                      onModelChange(model.id);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.optionEmoji}>{model.emoji}</Text>
                    <View style={styles.optionText}>
                      <View style={styles.optionHeader}>
                        <Text style={styles.optionName}>{model.displayName}</Text>
                        {model.recommended && (
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>Polecamy</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.optionDescription}>{model.description}</Text>
                      <Text style={styles.optionPrice}>
                        ${model.inputPrice} / ${model.outputPrice} per 1M tokens
                      </Text>
                    </View>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.cardBg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  disabled: {
    opacity: 0.5,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  modelName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modelCost: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  optionsList: {
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: Colors.dark.primary,
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionName: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  recommendedBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  optionDescription: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginBottom: 6,
  },
  optionPrice: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  checkmark: {
    fontSize: 24,
    color: Colors.dark.primary,
    marginLeft: 12,
  },
  closeButton: {
    backgroundColor: Colors.dark.cardBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
